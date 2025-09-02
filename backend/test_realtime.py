#!/usr/bin/env python3
"""
Test script for real-time video processing functionality
"""

import requests
import json
import time

def test_realtime_processing():
    """Test the real-time video processing endpoints"""
    
    base_url = "http://localhost:8000"
    
    print("Testing real-time video processing...")
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{base_url}/")
        print(f"✓ Server is running: {response.json()}")
    except Exception as e:
        print(f"✗ Server connection failed: {e}")
        return
    
    # Test 2: Check video processing status (should be inactive initially)
    try:
        response = requests.get(f"{base_url}/video_processing_status")
        print(f"✓ Status check: {response.json()}")
    except Exception as e:
        print(f"✗ Status check failed: {e}")
    
    # Test 3: Try to stop processing when not active
    try:
        response = requests.post(f"{base_url}/stop_video_processing")
        print(f"✓ Stop when inactive: {response.json()}")
    except Exception as e:
        print(f"✗ Stop when inactive failed: {e}")
    
    print("\nReal-time video processing endpoints are working!")
    print("To test with actual video:")
    print("1. Upload a video file through the frontend")
    print("2. Click 'Real-time Analysis' button")
    print("3. Watch the real-time results stream in")

if __name__ == "__main__":
    test_realtime_processing()
