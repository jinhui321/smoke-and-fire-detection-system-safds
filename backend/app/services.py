import cv2
import torch
import time
import os
import threading
import base64
import json
import pygame
from datetime import datetime
from collections import deque
from ultralytics import YOLO
from typing import List, Dict, Any, Optional


class DetectionService:
    def __init__(self, model_path: str = "YOLOv11m_best.pt"):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {self.device}")
        self.model = YOLO(model_path)
        self.model.to(self.device)
        print(f"Model loaded on device: {self.model.device}")
        
        # Global variables for real-time processing
        self.camera_active = False
        self.latest_detections = []
        self.latest_frame = None
        self.processing_lock = threading.Lock()
        self.stop_processing = False
        self.video_writer = None
        self.annotated_video_path = None
        
        # Fire detection alarm variables
        self.fire_detection_frames = deque(maxlen=5)
        self.camera_fire_frames = deque(maxlen=5)
        self.smoke_detection_frames = deque(maxlen=5)
        self.camera_smoke_frames = deque(maxlen=5)
        self.fire_alarm_sound_path = "sounds/fire_alert_sound.mp3"
        self.smoke_alarm_sound_path = "sounds/smoke_alert_sound.mp3"
        pygame.mixer.init()
        self.alarm_playing = False
        self.alarm_lock = threading.Lock()
        
        # Predefined account for authentication
        self.PREDEFINED_ACCOUNT = {
            "email": "admin@safds.com",
            "password": "admin123"
        }

    def play_alarm(self, alarm_type: str = "fire"):
        """Play alarm sound in a separate thread"""
        with self.alarm_lock:
            if self.alarm_playing:
                return  # Alarm is already playing
            self.alarm_playing = True
        
        def play_sound():
            try:
                if alarm_type == "fire":
                    sound_path = self.fire_alarm_sound_path
                    message = "🚨 FIRE ALARM ACTIVATED! 🚨"
                else:  # smoke
                    sound_path = self.smoke_alarm_sound_path
                    message = "🚨 SMOKE ALARM ACTIVATED! 🚨"
                    
                if os.path.exists(sound_path):
                    pygame.mixer.music.load(sound_path)
                    pygame.mixer.music.play()
                    print(message)
                    
                    # Wait for sound to finish
                    while pygame.mixer.music.get_busy():
                        time.sleep(0.1)
                else:
                    print(f"Warning: Alarm sound file not found at {sound_path}")
            except Exception as e:
                print(f"Error playing alarm sound: {e}")
            finally:
                with self.alarm_lock:
                    self.alarm_playing = False
        
        # Play sound in separate thread to avoid blocking
        sound_thread = threading.Thread(target=play_sound)
        sound_thread.daemon = True
        sound_thread.start()

    def check_detection_and_alarm(self, detections: List[Dict], fire_tracker: deque, smoke_tracker: deque) -> Optional[str]:
        """Check for fire and smoke detection and trigger appropriate alarms"""
        fire_detected = any("fire" in detection["class"].lower() for detection in detections)
        smoke_detected = any("smoke" in detection["class"].lower() for detection in detections)
        
        fire_tracker.append(fire_detected)
        smoke_tracker.append(smoke_detected)
        
        # Check if fire detected in all of the last 5 frames
        if len(fire_tracker) == 5 and all(fire_tracker):
            self.play_alarm("fire")
            return "fire"
        
        # Check if both fire and smoke detected in all of the last 5 frames (fire takes priority)
        if (len(fire_tracker) == 5 and len(smoke_tracker) == 5 and 
            all(fire_tracker) and all(smoke_tracker)):
            self.play_alarm("fire")  # Fire alarm takes priority
            return "fire_and_smoke"
        
        # Check if only smoke detected in all of the last 5 frames
        if (len(smoke_tracker) == 5 and all(smoke_tracker) and 
            not (len(fire_tracker) == 5 and all(fire_tracker))):
            self.play_alarm("smoke")
            return "smoke"
        
        return None

    def process_video_frames(self, video_path: str, results_dir: str = "results"):
        """Process video frames in real-time and update global detection results"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Unable to open video file: {video_path}")
            return
        
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_delay = int(1000 / video_fps) if video_fps > 0 else 33  # Default to 30fps
        
        # Create annotated video file path with timestamp
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext = os.path.splitext(video_path)[1]
        self.annotated_video_path = os.path.join(results_dir, f"annotated_{timestamp_str}{file_ext}")
        
        # Initialize video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.video_writer = cv2.VideoWriter(self.annotated_video_path, fourcc, video_fps, (frame_width, frame_height))
        
        print(f"Processing video: {video_path}, FPS: {video_fps}")
        print(f"Saving annotated video to: {self.annotated_video_path}")
        
        while not self.stop_processing:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Update latest frame
            with self.processing_lock:
                self.latest_frame = frame.copy()
            
            # Run YOLO detection on frame
            results = self.model(frame, conf=0.3)
            
            # Extract detections
            frame_detections = []
            for box in results[0].boxes:
                frame_detections.append({
                    "class": self.model.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
                })
            
            # Update global detections
            with self.processing_lock:
                self.latest_detections = frame_detections
            
            # Check for fire and smoke detection and trigger alarm if needed
            self.check_detection_and_alarm(frame_detections, self.fire_detection_frames, self.smoke_detection_frames)
            
            # Create annotated frame for saving
            annotated_frame = frame.copy()
            for detection in frame_detections:
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
            
            # Write annotated frame to video file
            if self.video_writer is not None:
                self.video_writer.write(annotated_frame)
            
            # Simulate frame processing time
            time.sleep(frame_delay / 1000.0)
        
        # Release resources
        cap.release()
        if self.video_writer is not None:
            self.video_writer.release()
            self.video_writer = None
            print(f"Annotated video saved to: {self.annotated_video_path}")
        print("Video processing stopped")

    def gen_processed_frames(self):
        """Generate processed video frames with detections"""
        while not self.stop_processing:
            with self.processing_lock:
                if self.latest_frame is not None:
                    frame_copy = self.latest_frame.copy()
                    detections_copy = self.latest_detections.copy()
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

    def gen_frames(self):
        """Generate camera frames with YOLO detection"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise RuntimeError("Could not start camera.")
        try:
            while self.camera_active:
                success, frame = cap.read()
                if not success:
                    break

                # Run YOLO model on frame
                results = self.model(frame, conf=0.4)
                
                # Extract detections for fire alarm checking
                frame_detections = []
                for box in results[0].boxes:
                    frame_detections.append({
                        "class": self.model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "bbox": box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
                    })
                
                # Check for fire and smoke detection and trigger alarm if needed
                self.check_detection_and_alarm(frame_detections, self.camera_fire_frames, self.camera_smoke_frames)

                # Draw YOLO detections
                annotated_frame = results[0].plot()

                # Encode as JPEG
                ret, buffer = cv2.imencode('.jpg', annotated_frame)
                frame_bytes = buffer.tobytes()

                # Stream frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        finally:
            cap.release()

    def authenticate_user(self, email: str, password: str) -> bool:
        """Authenticate user against predefined account"""
        return (email == self.PREDEFINED_ACCOUNT["email"] and 
                password == self.PREDEFINED_ACCOUNT["password"])

    def process_image(self, image_path: str, results_dir: str = "results") -> Dict[str, Any]:
        """Process a single image and return detection results"""
        results = self.model(image_path, conf=0.4)
        
        detections = []
        for box in results[0].boxes:
            detections.append({
                "class": self.model.names[int(box.cls)],
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
            "preprocess_ms": preprocess_time,
            "inference_ms": inference_time,
            "postprocess_ms": postprocess_time,
            "shape": list(results[0].orig_shape),
            "detections": detections
        }

    def start_camera(self):
        """Start camera processing"""
        self.camera_active = True
        self.camera_fire_frames.clear()
        self.camera_smoke_frames.clear()

    def stop_camera(self):
        """Stop camera processing"""
        self.camera_active = False
        self.camera_fire_frames.clear()
        self.camera_smoke_frames.clear()

    def start_video_processing(self, video_path: str):
        """Start video processing in background thread"""
        # Stop any existing processing
        self.stop_processing = True
        time.sleep(0.1)
        
        # Reset global variables
        self.latest_detections = []
        self.latest_frame = None
        self.stop_processing = False
        self.fire_detection_frames.clear()
        self.smoke_detection_frames.clear()
        
        # Start processing in background thread
        processing_thread = threading.Thread(
            target=self.process_video_frames, 
            args=(video_path,)
        )
        processing_thread.daemon = True
        processing_thread.start()

    def stop_video_processing(self) -> Dict[str, Any]:
        """Stop video processing and return results"""
        self.stop_processing = True
        self.fire_detection_frames.clear()
        self.smoke_detection_frames.clear()
        
        # Wait a moment for processing to complete
        time.sleep(0.5)
        
        result = {"status": "video processing stopped"}
        if self.annotated_video_path and os.path.exists(self.annotated_video_path):
            result["annotated_video_url"] = f"/results/{os.path.basename(self.annotated_video_path)}"
            result["annotated_video_path"] = self.annotated_video_path
        
        return result
