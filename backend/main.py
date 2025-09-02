from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import mimetypes
import cv2
import torch
from PIL import Image
import io
import time
import os
from ultralytics import YOLO
import shutil
import threading
import base64
import json

app = FastAPI()

# Load once globally
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")
model = YOLO("model.pt")
model.to(device)
print(f"Model loaded on device: {model.device}")

RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

# Global variables for real-time processing
camera_active = False
latest_detections = []
latest_frame = None
processing_lock = threading.Lock()
stop_processing = False

# Mount static folder so files can be accessed in browser
app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

class VideoProcessingRequest(BaseModel):
    video_path: str

PREDEFINED_ACCOUNT = {
    "email": "admin@fireguard.com",
    "password": "admin123"
}

def process_video_frames(video_path: str):
    """Process video frames in real-time and update global detection results"""
    global latest_detections, latest_frame, stop_processing
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Unable to open video file: {video_path}")
        return
    
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_delay = int(1000 / video_fps) if video_fps > 0 else 33  # Default to 30fps
    
    print(f"Processing video: {video_path}, FPS: {video_fps}")
    
    while not stop_processing:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Update latest frame
        with processing_lock:
            latest_frame = frame.copy()
        
        # Run YOLO detection on frame
        results = model(frame, conf=0.4)
        
        # Extract detections
        frame_detections = []
        for box in results[0].boxes:
            frame_detections.append({
                "class": model.names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
            })
        
        # Update global detections
        with processing_lock:
            latest_detections = frame_detections
        
        # Simulate frame processing time
        time.sleep(frame_delay / 1000.0)
    
    cap.release()
    print("Video processing stopped")

def gen_processed_frames():
    """Generate processed video frames with detections"""
    global latest_frame, latest_detections, stop_processing
    
    while not stop_processing:
        with processing_lock:
            if latest_frame is not None:
                frame_copy = latest_frame.copy()
                detections_copy = latest_detections.copy()
            else:
                time.sleep(0.1)
                continue
        
        # Draw detections on frame
        annotated_frame = frame_copy.copy()
        
        for detection in detections_copy:
            if "bbox" in detection and len(detection["bbox"]) == 4:
                x1, y1, x2, y2 = map(int, detection["bbox"])
                class_name = detection["class"]
                confidence = detection["confidence"]
                
                # Choose color based on class
                if "fire" in class_name.lower():
                    color = (0, 0, 255)  # Red for fire
                elif "smoke" in class_name.lower():
                    color = (0, 165, 255)  # Orange for smoke
                else:
                    color = (255, 255, 255)  # White for others
                
                # Draw bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                
                # Draw label
                label = f"{class_name} {confidence:.2f}"
                (label_width, label_height), baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
                )
                
                cv2.rectangle(annotated_frame,
                              (x1, y1 - label_height - baseline),
                              (x1 + label_width, y1),
                              color, thickness=-1)
                cv2.putText(annotated_frame, label,
                            (x1, y1 - baseline),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (255, 255, 255), 2)
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        if ret:
            frame_bytes = buffer.tobytes()
            
            # Create frame data with detection info
            frame_data = {
                "frame": base64.b64encode(frame_bytes).decode('utf-8'),
                "detections": detections_copy,
                "timestamp": time.time()
            }
            
            # Stream frame data as JSON
            yield f"data: {json.dumps(frame_data)}\n\n"
        
        time.sleep(0.033)  # ~30 FPS

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}

@app.post("/login")
def login(request: LoginRequest):
    if request.email == PREDEFINED_ACCOUNT["email"] and request.password == PREDEFINED_ACCOUNT["password"]:
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid email or password")

def gen_frames():
    global camera_active
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not start camera.")
    try:
        while camera_active:  # stop loop when flag is False
            success, frame = cap.read()
            if not success:
                break

            # Run YOLO model on frame
            results = model(frame, conf=0.5)  # you can adjust confidence threshold

            # Draw YOLO detections
            annotated_frame = results[0].plot()  # returns frame with bounding boxes

            # Encode as JPEG
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            frame_bytes = buffer.tobytes()

            # Stream frame
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(gen_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@app.post("/start_camera")
def start_camera():
    global camera_active
    camera_active = True
    return {"status": "camera started"}

@app.post("/stop_camera")
def stop_camera():
    global camera_active
    camera_active = False
    return {"status": "camera stopped"}

@app.post("/start_video_processing")
async def start_video_processing(request: VideoProcessingRequest):
    """Start real-time video processing"""
    global stop_processing, latest_detections, latest_frame
    
    # Stop any existing processing
    stop_processing = True
    time.sleep(0.1)  # Give time for threads to stop
    
    # Reset global variables
    latest_detections = []
    latest_frame = None
    stop_processing = False
    
    # Start processing in background thread
    processing_thread = threading.Thread(
        target=process_video_frames, 
        args=(request.video_path,)
    )
    processing_thread.daemon = True
    processing_thread.start()
    
    return {"status": "video processing started", "video_path": request.video_path}

@app.post("/stop_video_processing")
async def stop_video_processing():
    """Stop real-time video processing"""
    global stop_processing
    stop_processing = True
    return {"status": "video processing stopped"}

@app.get("/video_processing_stream")
async def video_processing_stream():
    """Stream processed video frames with detections"""
    return StreamingResponse(
        gen_processed_frames(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    file_ext = os.path.splitext(file.filename)[1]

    # Create a timestamp for unique filenames
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save original uploaded file with timestamp
    input_path = os.path.join(RESULTS_DIR, f"input_{timestamp_str}{file_ext}")

    # Save original uploaded file
    with open(input_path, "wb") as f:
        f.write(contents)

    detections = []

    # Handle video vs image separately
    if file_ext in [".mp4", ".avi", ".mov", ".mkv"]:
        # For videos, return the path for real-time processing
        return {
            "type": "video_uploaded",
            "video_path": input_path,
            "timestamp": datetime.now().isoformat(),
            "message": "Video uploaded successfully. Use start_video_processing to begin real-time analysis."
        }
    else:
        # Image processing (existing logic)
        results = model(input_path, conf=0.5)
        annotated_path = os.path.join(RESULTS_DIR, f"annotated_{timestamp_str}{file_ext}")
        results[0].save(filename=annotated_path)

        for box in results[0].boxes:
            detections.append({
                "class": model.names[int(box.cls)],
                "confidence": float(box.conf)
            })

    # Speeds
    yolo_speeds = results[0].speed
    preprocess_time = round(yolo_speeds['preprocess'], 1)
    inference_time = round(yolo_speeds['inference'], 1)
    postprocess_time = round(yolo_speeds['postprocess'], 1)

    detected_classes = [d["class"].lower() for d in detections]

    if "fire" in detected_classes and "smoke" in detected_classes:
        result_type = "fire_and_smoke"
        confidence = max([d["confidence"] for d in detections if d["class"].lower() in ["fire", "smoke"]])
    elif "fire" in detected_classes:
        result_type = "fire"
        confidence = max([d["confidence"] for d in detections if d["class"].lower() == "fire"])
    elif "smoke" in detected_classes:
        result_type = "smoke"
        confidence = max([d["confidence"] for d in detections if d["class"].lower() == "smoke"])
    else:
        result_type = "clear"
        confidence = 0.0

    return {
        "type": result_type,
        "confidence": confidence,
        "timestamp": datetime.now().isoformat(),
        "location": "uploaded",
        "preprocess_ms": preprocess_time,
        "inference_ms": inference_time,
        "postprocess_ms": postprocess_time,
        "shape": list(results[0].orig_shape),
        "detections": detections,
        "result_url": f"/results/{os.path.basename(annotated_path)}"
    }


    # return {
    #     "detections": detections,
    #     "preprocess_ms": round(preprocess_time, 2),
    #     "inference_ms": round(inference_time, 2),
    #     "postprocess_ms": round(postprocess_time, 2),
    #     "shape": results[0].orig_shape,
    #     "result_url": f"/results/{os.path.basename(annotated_path)}"
    # }
    

# @app.post("/predict")
# async def predict(file: UploadFile = File(...)):
#     try:
#         contents = await file.read()

#         if file.content_type.startswith("image/"):
#             image = Image.open(io.BytesIO(contents)).convert('RGB')
#             # TODO: preprocess image and run through model
#             return {
#                 "type": "fire",
#                 "confidence": 0.92,
#                 "timestamp": "2025-01-01T12:00:00",
#                 "location": "uploaded"
#             }

#         elif file.content_type.startswith("video/"):
#             # TODO: handle video processing logic
#             return {
#                 "type": "smoke",
#                 "confidence": 0.88,
#                 "timestamp": "2025-01-01T12:00:00",
#                 "location": "video uploaded"
#             }

#         else:
#             raise HTTPException(status_code=400, detail="Unsupported file type")

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/predict")
# def predict(file: UploadFile = File(...)):
#     # Load the model (for demo, load every time; in production, load once globally)
#     model = torch.load("model.pt", map_location=torch.device('cpu'))
#     model.eval()
#     # Read image
#     image_bytes = file.file.read()
#     image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
#     # TODO: Preprocess image as required by your model
#     # For now, return a dummy result
#     # result = model(preprocessed_image)
#     # For demo, just return a fake result
#     return {"type": "fire", "confidence": 0.92, "timestamp": "2025-01-01T12:00:00", "location": "uploaded"}