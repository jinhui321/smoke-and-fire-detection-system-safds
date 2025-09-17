import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, CameraOff, FileImage, FileVideo, Play, AlertTriangle, CheckCircle, X, Square, Download } from 'lucide-react';
import { DetectionResult, VideoProcessingResult, ProcessedFrame } from '../types';
// import { generateMockDetection } from '../utils/mockData';

const DetectionTab: React.FC = () => {
  const [mode, setMode] = useState("upload"); // "upload" or "camera"
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // New state for real-time video processing
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [videoProcessingResult, setVideoProcessingResult] = useState<VideoProcessingResult | null>(null);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const [currentDetections, setCurrentDetections] = useState<ProcessedFrame['detections']>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup preview URL and event source on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [previewUrl]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        alert('Please select an image or video file.');
        return;
      }
      
      setIsPreviewLoading(true);
      
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setUploadedFile(file);
      setDetectionResult(null);
      setVideoProcessingResult(null);
      setProcessedFrame(null);
      setCurrentDetections([]);
      
      // Simulate loading time for large files
      setTimeout(() => {
        setIsPreviewLoading(false);
      }, 500);
    }
  };

  const analyzeMedia = async () => {
    if (!uploadedFile || (!uploadedFile.type.startsWith('image/') && !uploadedFile.type.startsWith('video/'))) {
      setDetectionResult(null);
      setIsAnalyzing(false);
      alert('Please upload an image or video file for analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    setDetectionResult(null);
    setVideoProcessingResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.type === "video_uploaded") {
          // Handle video upload - start real-time processing
          setVideoProcessingResult(result);
          await startVideoProcessing(result.video_path);
        } else {
          // Handle image result
          setDetectionResult(result);
        }
      } else {
        setDetectionResult(null);
        alert('Prediction failed.');
      }
    } catch (error) {
      setDetectionResult(null);
      alert('Error connecting to backend.');
    }
    setIsAnalyzing(false);
  };

  const startVideoProcessing = async (videoPath: string) => {
    try {
      // Start video processing on backend
      const response = await fetch('http://localhost:8000/start_video_processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_path: videoPath }),
      });

      if (response.ok) {
        setIsVideoProcessing(true);
        
        // Start streaming processed frames
        startFrameStreaming();
      } else {
        alert('Failed to start video processing.');
      }
    } catch (error) {
      alert('Error starting video processing.');
    }
  };

  const startFrameStreaming = () => {
    // Close existing event source if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new event source for streaming
    const eventSource = new EventSource('http://localhost:8000/video_processing_stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.frame) {
          setProcessedFrame(`data:image/jpeg;base64,${data.frame}`);
          setCurrentDetections(data.detections || []);
        }
      } catch (error) {
        console.error('Error parsing frame data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };
  };

  const stopVideoProcessing = async () => {
    try {
      const response = await fetch('http://localhost:8000/stop_video_processing', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // If annotated video is available, update videoProcessingResult with download URL
        if (result.annotated_video_url) {
          setVideoProcessingResult(prev => prev ? {
            ...prev,
            annotated_video_url: result.annotated_video_url
          } : null);
        }
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setIsVideoProcessing(false);
      // Keep the last processed frame and detections visible after stopping
      // setProcessedFrame(null);
      // setCurrentDetections([]);
    } catch (error) {
      console.error('Error stopping video processing:', error);
    }
  };

  const handleStartCamera = () => {
    fetch("http://localhost:8000/start_camera", { method: "POST" });
    setCameraActive(true);
  };
  
  const handleStopCamera = () => {
    fetch("http://localhost:8000/stop_camera", { method: "POST" });
    setCameraActive(false);
  };

  const clearResults = () => {
    setDetectionResult(null);
    setUploadedFile(null);
    setCameraActive(false);
    setIsPreviewLoading(false);
    setVideoProcessingResult(null);
    setProcessedFrame(null);
    setCurrentDetections([]);
    setIsVideoProcessing(false);
    
    // Stop video processing if active
    if (isVideoProcessing) {
      stopVideoProcessing();
    }
    
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'fire':
        return 'text-red-500';
      case 'smoke':
        return 'text-orange-500';
      case 'fire_and_smoke':
        return 'text-pink-500';
      case 'clear':
        return 'text-emerald-500';
      default:
        return 'text-gray-500';
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'fire':
      case 'smoke':
      case 'fire_and_smoke':
        return <AlertTriangle className="w-6 h-6" />;
      case 'clear':
        return <CheckCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const handleDownloadResult = () => {
    if (detectionResult?.result_url) {
      const filename = detectionResult.result_url.split('/').pop();
      const downloadUrl = `http://localhost:8000/download/${filename}`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'annotated_result';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadVideo = () => {
    if (videoProcessingResult?.annotated_video_url) {
      const filename = videoProcessingResult.annotated_video_url.split('/').pop();
      const downloadUrl = `http://localhost:8000/download/${filename}`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'annotated_video';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Left: Detection Analysis */}
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4">Detection Analysis</h2>

      {/* Tab Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            clearResults(); // Clears results on tab change
            setMode("upload");
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "upload"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Upload Media
        </button>
        <button
          onClick={() => {
            clearResults(); // Clears results on tab change
            setMode("camera");
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "upload"
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-blue-600 text-white"
          }`}
        >
          Live Camera
        </button>
      </div>

      {/* Upload Mode */}
      {mode === "upload" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, MP4, MOV up to 50MB
                  </p>
                </label>
              </div>

              {uploadedFile && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    {uploadedFile.type.startsWith("image/") ? (
                      <FileImage className="w-5 h-5 text-blue-400" />
                    ) : (
                      <FileVideo className="w-5 h-5 text-purple-400" />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {uploadedFile.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={clearResults}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center">
              {isPreviewLoading ? (
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : previewUrl ? (
                uploadedFile?.type.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[300px] max-w-full object-contain"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-[300px] max-w-full object-contain"
                  />
                )
              ) : (
                <p className="text-gray-500">No preview available</p>
              )}
            </div>
          </div>

          {/* Analysis Button */}
          <div className="mt-6 text-center space-y-3">
            <button
              onClick={analyzeMedia}
              disabled={!uploadedFile || isAnalyzing}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Analysis
                </>
              )}
            </button>
            
            {/* Clear Media Button */}
            {(uploadedFile || isVideoProcessing) && (
              <button
                onClick={clearResults}
                className="px-9 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <X className="w-5 h-5" />
                Clear Media
              </button>
            )}
          </div>
        </>
      )}

      {/* Camera Mode */}
      {mode === "camera" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-700">
            {cameraActive ? (
              <div className="space-y-4">
                <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-white">Camera Active</p>
                <p className="text-sm text-gray-400">
                  Live webcam feed from backend
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <CameraOff className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-400">Camera not active</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (cameraActive) {
                handleStopCamera();
              } else {
                handleStartCamera();
              }
            }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              cameraActive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
      )}
    </div>

    {/* Right: Detection Results */}
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-medium text-white mb-4">Detection Results</h3>
      
      {/* Media Display Container */}
      <div className="bg-gray-900 p-6 rounded-lg h-[400px] flex flex-col items-center justify-center">
        <div className="w-full h-[380px] flex items-center justify-center">
          {cameraActive ? (
            // Live Camera Feed
            <img
              src="http://localhost:8000/video_feed"
              alt="Live Webcam Feed"
              className="max-w-full max-h-full object-contain rounded-lg border border-gray-700 bg-black"
            />
          ) : processedFrame ? (
            // Video Processing (active or completed)
            <img
              src={processedFrame}
              alt="Processed Video Frame"
              className="max-w-full max-h-full object-contain rounded-lg border border-gray-700 bg-black"
            />
          ) : isVideoProcessing ? (
            // Video Processing Loading
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-white">Processing video...</p>
              <p className="text-sm text-gray-400">Initializing real-time detection</p>
            </div>
          ) : detectionResult?.result_url ? (
            // Detection Results for Images
            <img
              src={`http://localhost:8000${detectionResult.result_url}`}
              alt="Annotated result"
              className="max-w-full max-h-full object-contain rounded-lg border border-gray-700"
            />
          ) : (
            // Default message
            <p className="text-gray-400">
              No detection results yet. Upload media or start the camera to begin analysis.
            </p>
          )}
        </div>
      </div>

      {/* Detection Information Below */}
      <div className="mt-4">
        {cameraActive && (
          <div className="text-center">
            <p className="text-white font-medium">Live Camera Feed Active</p>
            <p className="text-sm text-gray-400">Real-time fire and smoke detection</p>
          </div>
        )}
        
        {(isVideoProcessing || videoProcessingResult) && (
          <div className="text-center">
            {currentDetections.length > 0 ? (
              <>
                <p className="text-white font-medium mb-2">{isVideoProcessing ? 'Real-time Detections:' : 'Final Detections:'}</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentDetections.map((detection, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          detection.class.toLowerCase().includes('fire') 
                            ? 'bg-red-600 text-white' 
                            : detection.class.toLowerCase().includes('smoke')
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {detection.class} ({(detection.confidence * 100).toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : isVideoProcessing ? (
              <p className="text-sm text-gray-400">No detections in current frame</p>
            ) : (
              <p className="text-white font-medium">Video Processing Complete</p>
            )}
            <div className="flex flex-col gap-2 items-center">
              {isVideoProcessing ? (
                <button
                  onClick={stopVideoProcessing}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Processing
                </button>
              ) : null}
              {videoProcessingResult?.annotated_video_url && (
                <button
                  onClick={handleDownloadVideo}
                  className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Annotated Result
                </button>
              )}
            </div>
          </div>
        )}
        
        {detectionResult && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className={`${getResultColor(detectionResult.type)}`}>
                {getResultIcon(detectionResult.type)}
              </div>
              <div>
                <h4
                  className={`text-xl font-bold ${getResultColor(
                    detectionResult.type
                  )}`}
                >
                  {detectionResult.type.toUpperCase()}
                  {detectionResult.type !== "clear" && " DETECTED"}
                </h4>
              </div>
            </div>
            <p className="text-gray-400 mb-3">
              Confidence: {Math.round(detectionResult.confidence * 100)}%
            </p>
            {detectionResult.result_url && (
              <button
                onClick={handleDownloadResult}
                className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <Download className="w-4 h-4" />
                Download Annotated Result
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default DetectionTab;