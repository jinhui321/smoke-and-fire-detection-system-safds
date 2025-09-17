from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from datetime import datetime
import os
import mimetypes
from .models import (
    LoginRequest, VideoProcessingRequest, VideoUploadResponse, 
    PredictionResponse, StatusResponse
)
from .services import DetectionService

router = APIRouter()

# Initialize detection service
detection_service = DetectionService()

@router.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}

@router.post("/login")
def login(request: LoginRequest):
    if detection_service.authenticate_user(request.email, request.password):
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid email or password")

@router.get("/video_feed")
def video_feed():
    return StreamingResponse(
        detection_service.gen_frames(), 
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

@router.post("/start_camera")
def start_camera():
    detection_service.start_camera()
    return {"status": "camera started"}

@router.post("/stop_camera")
def stop_camera():
    detection_service.stop_camera()
    return {"status": "camera stopped"}

@router.post("/start_video_processing")
async def start_video_processing(request: VideoProcessingRequest):
    """Start real-time video processing"""
    detection_service.start_video_processing(request.video_path)
    return {"status": "video processing started", "video_path": request.video_path}

@router.post("/stop_video_processing")
async def stop_video_processing():
    """Stop real-time video processing"""
    result = detection_service.stop_video_processing()
    return result

@router.get("/video_processing_stream")
async def video_processing_stream():
    """Stream processed video frames with detections"""
    return StreamingResponse(
        detection_service.gen_processed_frames(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download annotated result file"""
    results_dir = "results"
    file_path = os.path.join(results_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get the MIME type
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'
    
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    file_ext = os.path.splitext(file.filename)[1]
    results_dir = "results"

    # Create a timestamp for unique filenames
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save original uploaded file with timestamp
    input_path = os.path.join(results_dir, f"input_{timestamp_str}{file_ext}")

    # Save original uploaded file
    with open(input_path, "wb") as f:
        f.write(contents)

    # Handle video vs image separately
    if file_ext in [".mp4", ".avi", ".mov", ".mkv"]:
        # For videos, return the path for real-time processing
        return VideoUploadResponse(
            type="video_uploaded",
            video_path=input_path,
            timestamp=datetime.now().isoformat(),
            message="Video uploaded successfully. Use start_video_processing to begin real-time analysis."
        )
    else:
        # Image processing
        result = detection_service.process_image(input_path, results_dir)
        
        # Save annotated image
        annotated_path = os.path.join(results_dir, f"annotated_{timestamp_str}{file_ext}")
        results = detection_service.model(input_path, conf=0.4)
        results[0].save(filename=annotated_path)

        return PredictionResponse(
            type=result["type"],
            confidence=result["confidence"],
            timestamp=datetime.now().isoformat(),
            # location="uploaded",
            preprocess_ms=result["preprocess_ms"],
            inference_ms=result["inference_ms"],
            postprocess_ms=result["postprocess_ms"],
            shape=result["shape"],
            detections=result["detections"],
            result_url=f"/results/{os.path.basename(annotated_path)}"
        )
