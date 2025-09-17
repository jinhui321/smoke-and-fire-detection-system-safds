from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class VideoProcessingRequest(BaseModel):
    video_path: str


class DetectionResponse(BaseModel):
    class_name: str
    confidence: float
    bbox: list = []


class VideoUploadResponse(BaseModel):
    type: str
    video_path: str = None
    timestamp: str
    message: str = None


class PredictionResponse(BaseModel):
    type: str
    confidence: float
    timestamp: str
    # location: str
    preprocess_ms: float
    inference_ms: float
    postprocess_ms: float
    shape: list
    detections: list
    result_url: str = None


class StatusResponse(BaseModel):
    status: str
    video_path: str = None
    annotated_video_url: str = None
    annotated_video_path: str = None
