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
  const [annotatedVideoPath, setAnnotatedVideoPath] = useState<string | null>(null);
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
      setAnnotatedVideoPath(null);
      
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
    setAnnotatedVideoPath(null);

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
        if (result.annotated_video_path) {
          setAnnotatedVideoPath(result.annotated_video_path);
        }
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setIsVideoProcessing(false);
      setProcessedFrame(null);
      setCurrentDetections([]);
    } catch (error) {
      console.error('Error stopping video processing:', error);
    }
  };

  const downloadFile = async (filePath: string, filename?: string) => {
    try {
      const response = await fetch(`http://localhost:8000${filePath}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'downloaded_file';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download file.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file.');
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
    setAnnotatedVideoPath(null);
    
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
          <div className="mt-6 text-center">
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
      <div className="bg-gray-900 p-6 rounded-lg min-h-[400px] flex flex-col items-center justify-center">
        {cameraActive ? (
          // Live Camera Feed
          <div className="space-y-4">
            <img
              src="http://localhost:8000/video_feed"
              alt="Live Webcam Feed"
              className="mx-auto rounded-lg border border-gray-700 max-h-64 object-contain bg-black"
              style={{ width: "100%", maxWidth: 320 }}
            />
            <p className="text-white">Camera Active</p>
          </div>
        ) : isVideoProcessing ? (
          // Real-time Video Processing
          <div className="space-y-4 text-center">
            {processedFrame ? (
              <>
                <img
                  src={processedFrame}
                  alt="Processed Video Frame"
                  className="mx-auto rounded-lg border border-gray-700 max-h-64 object-contain bg-black"
                  style={{ width: "100%", maxWidth: 400 }}
                />
                <div className="text-white">
                  <p className="font-medium">Real-time Video Processing</p>
                  {currentDetections.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-400">Detections:</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-1">
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
                  ) : (
                    <p className="text-sm text-gray-400">No detections in current frame</p>
                  )}
                </div>
                <button
                  onClick={stopVideoProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  <Square className="w-4 h-4" />
                  Stop Processing
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-white">Processing video...</p>
                <p className="text-sm text-gray-400">Initializing real-time detection</p>
              </div>
            )}
          </div>
        ) : annotatedVideoPath ? (
          // Video Processing Complete with Download
          <div className="space-y-4 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div className="text-white">
              <h4 className="text-xl font-bold text-green-500 mb-2">Video Processing Complete!</h4>
              <p className="text-gray-300 mb-4">The annotated video has been saved and is ready for download.</p>
              
              {/* Download Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => downloadFile(annotatedVideoPath, `annotated_video_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  <Download className="w-5 h-5" />
                  Download Annotated Video
                </button>
                
                {uploadedFile && (
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(uploadedFile);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = uploadedFile.name;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-5 h-5" />
                    Download Original Video
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : detectionResult ? (
          // Detection Results for Images
          <>
            <div className="flex items-center gap-4 mb-4">
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
                <p className="text-gray-400">
                  Confidence: {Math.round(detectionResult.confidence * 100)}%
                </p>
              </div>
            </div>

            {detectionResult?.result_url && (
              <div className="mt-4 space-y-4">
                  <img
                    src={`http://localhost:8000${detectionResult.result_url}`}
                    alt="Annotated result"
                    className="rounded-lg border border-gray-700"
                  />
                
                {/* Download Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => downloadFile(detectionResult.result_url!, `annotated_image_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-5 h-5" />
                    Download Annotated Image
                  </button>
                  
                  {uploadedFile && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(uploadedFile);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = uploadedFile.name;
                        document.body.appendChild(a);
                        a.click();
                        URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Download className="w-5 h-5" />
                      Download Original Image
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // Default message
          <p className="text-gray-400">
            No detection results yet. Upload media or start the camera to begin analysis.
          </p>
        )}
      </div>
    </div>
  </div>
  );
};

export default DetectionTab;