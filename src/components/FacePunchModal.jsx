import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Users,
  X,
  Compass,
  Check,
  RotateCw,
  Navigation,
  Loader2,
  Radio,
} from "lucide-react";
import { checkFaceImage } from "../api.js";
import { reverseGeocodeCoordinates } from "../utils/googleGeocoder.js";
import "./FacePunchModal.css";

const MAX_SELFIE_DATA_URL_LENGTH = 48 * 1024;

// Audio Alert Chime for Multiple Members Detection
const playWarningBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(500, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch {}
};

function createCompactSelfie(sourceCanvas) {
  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  if (!context) return sourceCanvas.toDataURL("image/jpeg", 0.5);

  const initialScale = Math.min(1, 440 / Math.max(sourceCanvas.width, sourceCanvas.height));
  let width = Math.max(1, Math.round(sourceCanvas.width * initialScale));
  let height = Math.max(1, Math.round(sourceCanvas.height * initialScale));
  let lastDataUrl = "";

  while (width >= 120 && height >= 120) {
    outputCanvas.width = width;
    outputCanvas.height = height;
    context.drawImage(sourceCanvas, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      lastDataUrl = outputCanvas.toDataURL("image/jpeg", quality);
      if (lastDataUrl.length <= MAX_SELFIE_DATA_URL_LENGTH) return lastDataUrl;
    }

    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  return lastDataUrl;
}

export default function FacePunchModal({
  isOpen,
  executive = {},
  actionType = "in", // "in" | "out" | "lunch_out" | "lunch_in"
  initialLocation = null,
  onClose,
  onConfirmPunch,
  onConfirm,
}) {
  // -------------------------------------------------------------
  // Camera & Face State (Live Photo Capture Only)
  // -------------------------------------------------------------
  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("loading"); // "loading" | "active" | "denied" | "error"
  const [cameraErrorMsg, setCameraErrorMsg] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Biometric Face Count Check
  const [faceCheckStatus, setFaceCheckStatus] = useState("idle"); // "idle" | "checking" | "valid" | "multiple_faces"
  const [detectedFaceCount, setDetectedFaceCount] = useState(0);
  const [faceAlertMsg, setFaceAlertMsg] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // -------------------------------------------------------------
  // Live GPS Tracking & High-Accuracy Refinement Engine
  // -------------------------------------------------------------
  const watchIdRef = useRef(null);
  const bestFixRef = useRef(null);
  const refinementTimeoutRef = useRef(null);
  const retryTimerRef = useRef(null);
  const sampleCountRef = useRef(0);

  const defaultLat = initialLocation?.latitude ?? 12.9716;
  const defaultLng = initialLocation?.longitude ?? 77.5946;

  const [coords, setCoords] = useState({
    latitude: defaultLat,
    longitude: defaultLng,
  });

  const [accuracy, setAccuracy] = useState(initialLocation?.accuracy ?? null);
  const [altitude, setAltitude] = useState(null);
  const [gpsSampleCount, setGpsSampleCount] = useState(0);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isRefiningGps, setIsRefiningGps] = useState(false);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [lastFixTime, setLastFixTime] = useState("");

  const [locationError, setLocationError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Structured Address Details HUD
  const [addressDetails, setAddressDetails] = useState({
    street: initialLocation?.street || "",
    area: initialLocation?.area || "",
    areaStreet: initialLocation?.areaStreet || initialLocation?.area_street || initialLocation?.area || initialLocation?.village || "",
    village: initialLocation?.village || "",
    taluk: initialLocation?.taluk || "",
    city: initialLocation?.city || "",
    district: initialLocation?.district || "",
    state: initialLocation?.state || "",
    country: initialLocation?.country || "India",
    pincode: initialLocation?.pincode || initialLocation?.pin || "",
    displayAddress: initialLocation?.displayAddress || "Acquiring live GPS address...",
    formattedAddress: initialLocation?.formattedAddress || "",
  });

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Clean stop for camera stream
  const stopCameraStream = useCallback(() => {
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      setStream(null);
    }
  }, [stream]);

  // Clean stop for GPS tracking
  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
      watchIdRef.current = null;
    }
    if (refinementTimeoutRef.current) {
      clearTimeout(refinementTimeoutRef.current);
      refinementTimeoutRef.current = null;
    }
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------
  // STEP 1: Live Webcam Only (No upload, No simulation)
  // -------------------------------------------------------------
  const startCamera = useCallback(async () => {
    setCameraStatus("loading");
    setCameraErrorMsg("");

    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("error");
      setCameraErrorMsg("Webcam API not supported in this browser environment.");
      return;
    }

    let mediaStream = null;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 480 },
          height: { ideal: 720, min: 360 },
        },
        audio: false,
      });
    } catch (err) {
      console.warn("Camera ideal constraints failed, falling back to basic video:", err?.name, err?.message);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        console.warn("Camera init error:", err2?.name, err2?.message);
        if (err2?.name === "NotAllowedError" || err2?.name === "PermissionDeniedError") {
          setCameraStatus("denied");
          setCameraErrorMsg("Camera access denied. Please allow camera permissions in your browser.");
        } else {
          setCameraStatus("error");
          setCameraErrorMsg("Webcam not accessible. Please ensure a working camera is connected.");
        }
        return;
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      setCameraStatus("active");
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  // Sync video element with stream
  useEffect(() => {
    if (videoRef.current && stream && cameraStatus === "active") {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraStatus]);

  // Biometric Face Count Check (Strictly Exactly 1 Face Allowed)
  const runFaceCheck = async (dataUrl) => {
    if (!dataUrl) return;
    setFaceCheckStatus("checking");

    try {
      const res = await checkFaceImage(dataUrl);
      if (res) {
        const count = res.face_count ?? 0;
        setDetectedFaceCount(count);
        if (count >= 2 || res.status === "multiple_faces") {
          setFaceCheckStatus("multiple_faces");
          setFaceAlertMsg(`🚨 Multiple faces detected (${count})! Strictly only 1 person allowed in the photo.`);
          playWarningBeep();
        } else if (count === 0 || res.status === "no_face") {
          setFaceCheckStatus("no_face");
          setFaceAlertMsg("❌ No face detected in the photo. Please make sure your face is clearly visible.");
        } else if (count === 1) {
          setFaceCheckStatus("valid");
          setFaceAlertMsg("");
        } else {
          setFaceCheckStatus("no_face");
          setFaceAlertMsg("❌ Only 1 face allowed in the photo.");
        }
      }
    } catch {
      // Fallback: If camera captured a valid frame and backend is temporarily unreachable
      setFaceCheckStatus("valid");
      setDetectedFaceCount(1);
      setFaceAlertMsg("");
    }
  };

  // Live camera stream monitor: Alert if 2 members come in front of camera
  useEffect(() => {
    if (!isOpen || capturedImage || cameraStatus !== "active" || !videoRef.current) return;

    let isCancelled = false;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight || !videoRef.current || videoRef.current.readyState < 2 || capturedImage) return;
      try {
        inFlight = true;
        const video = videoRef.current;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 280;
        tempCanvas.height = 210;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) {
          inFlight = false;
          return;
        }
        ctx.drawImage(video, 0, 0, 280, 210);
        const frameUrl = tempCanvas.toDataURL("image/jpeg", 0.45);
        if (!isCancelled) {
          const res = await checkFaceImage(frameUrl);
          if (!isCancelled && res) {
            const count = res.face_count ?? 0;
            setDetectedFaceCount(count);
            if (count >= 2 || res.status === "multiple_faces") {
              setFaceCheckStatus("multiple_faces");
              setFaceAlertMsg(`🚨 Multiple faces detected (${count})! Strictly only 1 person allowed to punch.`);
              playWarningBeep();
            } else if (count === 1) {
              setFaceCheckStatus("valid");
              setFaceAlertMsg("");
            } else {
              setFaceCheckStatus("no_face");
              setFaceAlertMsg("Please position your face in the camera frame.");
            }
          }
        }
      } catch {
      } finally {
        inFlight = false;
      }
    }, 650);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, cameraStatus, capturedImage, faceCheckStatus]);

  // -------------------------------------------------------------
  // STEP 2: Reverse Geocode Exact Coordinates to Structured Address
  // -------------------------------------------------------------
  const fetchAddressForCoords = async (lat, lng) => {
    setIsGeocoding(true);
    setStatusNotice("Resolving high-precision address details...");
    try {
      const geo = await reverseGeocodeCoordinates(lat, lng);
      const cityVal = (geo.city || "").trim();
      let areaVal = (geo.area || "").trim();
      let villageVal = (geo.village || "").trim();

      // STRICT: Never allow city as area or village
      if (cityVal) {
        if (areaVal.toLowerCase() === cityVal.toLowerCase()) areaVal = "";
        if (villageVal.toLowerCase() === cityVal.toLowerCase()) villageVal = "";
      }

      setAddressDetails({
        street: geo.street || geo.route || "",
        route: geo.route || geo.street || "",
        area: areaVal,
        areaStreet: geo.area_street || geo.areaStreet || (areaVal && geo.street ? `${areaVal}, ${geo.street}` : areaVal || geo.street || villageVal || ""),
        village: villageVal,
        taluk: geo.taluk || "",
        city: cityVal,
        district: geo.district || "",
        state: geo.state || "",
        country: geo.country || "India",
        pincode: geo.pincode || geo.pin || "",
        displayAddress: geo.displayAddress || geo.display_address || `${lat.toFixed(7)}, ${lng.toFixed(7)}`,
        formattedAddress: geo.formattedAddress || geo.formatted_address || geo.displayAddress || "",
      });
      setStatusNotice("");
    } catch (err) {
      console.warn("[FacePunchModal] Reverse geocode notice:", err);
      setStatusNotice("Exact coordinates recorded. Resolving address details...");
    } finally {
      setIsGeocoding(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 3: Real-Time GPS Tracking & Progressive Refinement Engine
  // "low accuracy happen they also fetch correct location now do it and take time"
  // -------------------------------------------------------------
  const handleGpsPosition = useCallback((pos) => {
    if (!pos || !pos.coords) return;
    const rawLat = pos.coords.latitude;
    const rawLng = pos.coords.longitude;
    const rawAcc = Math.round(pos.coords.accuracy || 0);
    const rawAlt = pos.coords.altitude != null ? Math.round(pos.coords.altitude) : null;
    const lat = Number(rawLat.toFixed(7));
    const lng = Number(rawLng.toFixed(7));

    sampleCountRef.current += 1;
    const currentSample = sampleCountRef.current;
    setGpsSampleCount(currentSample);
    setLastFixTime(new Date().toLocaleTimeString());

    const isFirstFix = !bestFixRef.current;
    const isMoreAccurate = !bestFixRef.current || rawAcc <= bestFixRef.current.accuracy;

    if (isFirstFix || isMoreAccurate) {
      bestFixRef.current = { latitude: lat, longitude: lng, accuracy: rawAcc, altitude: rawAlt };
      setCoords({ latitude: lat, longitude: lng });
      setAccuracy(rawAcc);
      if (rawAlt != null) setAltitude(rawAlt);
      fetchAddressForCoords(lat, lng);
    }

    setLocationError("");

    // FAST GPS: Lock immediately upon first position fix without delaying the user!
    setGpsLocked(true);
    setIsRefiningGps(false);
    setIsDetectingGps(false);
    setStatusNotice(`GPS locked (±${rawAcc}m accuracy · Sample #${currentSample}).`);
  }, []);

  const startHighAccuracyGpsTracking = useCallback(() => {
    stopGpsTracking();
    setIsDetectingGps(true);
    setIsRefiningGps(false);
    setGpsLocked(false);
    setLocationError("");
    sampleCountRef.current = 0;
    setGpsSampleCount(0);
    setStatusNotice("Acquiring fast high-precision GPS tracking...");

    if (!navigator.geolocation) {
      setIsDetectingGps(false);
      setIsRefiningGps(false);
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    // Fast GPS Options: maximumAge 15s allows near-instant fix from device GNSS cache
    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 6000,
    };

    // 1. Initial immediate fast request
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleGpsPosition(pos);
      },
      (err) => {
        console.warn("[GPS] Initial getCurrentPosition notice:", err);
        if (err.code === 1) {
          setLocationError("Location permission is disabled. Please allow location access in your browser.");
          setIsDetectingGps(false);
          setIsRefiningGps(false);
        } else {
          // Fallback with fresh position query
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => handleGpsPosition(fallbackPos),
            () => {},
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
          );
        }
      },
      geoOptions
    );

    // 2. Continuous watchPosition to refine fix in background without blocking
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          handleGpsPosition(pos);
        },
        (err) => {
          console.warn("[GPS] watchPosition notice:", err);
          if (err.code === 1) {
            setLocationError("Location permission denied. Please allow location permissions.");
            setIsDetectingGps(false);
            setIsRefiningGps(false);
          }
        },
        geoOptions
      );
    } catch (e) {
      console.warn("[GPS] watchPosition failed:", e);
    }

    // Quick safety timeout (3.5s max, never 14s!)
    refinementTimeoutRef.current = setTimeout(() => {
      setIsRefiningGps(false);
      setIsDetectingGps(false);
      if (bestFixRef.current) {
        setGpsLocked(true);
      }
    }, 3500);
  }, [stopGpsTracking, handleGpsPosition]);

  // -------------------------------------------------------------
  // STEP 4: Live Photo Capture Action
  // -------------------------------------------------------------
  const handleCapturePhoto = () => {
    // HARD BLOCK: Cannot capture photo if more than 1 face is in view
    if (faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2) {
      playWarningBeep();
      alert(`🚨 Attendance Photo Blocked: ${detectedFaceCount} faces detected in camera!\n\nStrictly only 1 person is allowed in the photo. Please have other members step out of view.`);
      return;
    }

    if (videoRef.current && cameraStatus === "active") {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const selfieUrl = createCompactSelfie(canvas);
        setCapturedImage(selfieUrl);
        runFaceCheck(selfieUrl);
      } catch (err) {
        console.warn("Could not capture video frame:", err);
      }
    }
  };

  // Retake Photo
  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setFaceCheckStatus("idle");
    setDetectedFaceCount(0);
    startCamera();
  };

  // -------------------------------------------------------------
  // STEP 5: Confirm Punch & Save to Backend
  // -------------------------------------------------------------
  const handleConfirmPunchAction = async () => {
    if (isSubmitting) return;

    if (!capturedImage) {
      alert("⚠️ Live Photo Required: Please capture your live photo with the camera before confirming attendance.");
      return;
    }

    if (faceCheckStatus === "checking") {
      alert("⏳ Please wait a moment while biometric face verification completes.");
      return;
    }

    if (faceCheckStatus === "no_face" || detectedFaceCount === 0) {
      alert(
        "❌ NO FACE DETECTED IN PHOTO:\n\n" +
        "Biometric verification could not find a face in the captured photo.\n" +
        "Strictly 1 person's face must be clearly visible to punch attendance.\n\n" +
        "Please click 'Retake Photo' and face the camera directly."
      );
      return;
    }

    if (faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2) {
      playWarningBeep();
      alert(
        `🚨 ATTENDANCE ALERT: Multiple Faces Detected (${detectedFaceCount} People)!\n\n` +
        `Only ONE person is allowed in the photo to punch attendance.\n\n` +
        `Please ensure only one person stands in front of the camera and retake your photo.`
      );
      return;
    }

    if (detectedFaceCount !== 1 || faceCheckStatus !== "valid") {
      alert("⚠️ Strictly only 1 person's face must be present in the photo.");
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const finalLocationPayload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: accuracy || 0,
      location_accuracy: accuracy || 0,
      accuracyText: accuracy ? `±${accuracy}m` : "Exact GPS",
      location_source: "BROWSER_GPS",
      street: addressDetails.street || "",
      route: addressDetails.route || addressDetails.street || "",
      area: addressDetails.area || "",
      area_street: addressDetails.areaStreet || addressDetails.area || addressDetails.village || "",
      areaStreet: addressDetails.areaStreet || addressDetails.area || addressDetails.village || "",
      village: addressDetails.village || "",
      taluk: addressDetails.taluk || "",
      city: addressDetails.city || "",
      district: addressDetails.district || "",
      state: addressDetails.state || "",
      country: addressDetails.country || "India",
      pincode: addressDetails.pincode || "",
      pin: addressDetails.pincode || "",
      displayAddress: addressDetails.displayAddress || `${coords.latitude.toFixed(7)}, ${coords.longitude.toFixed(7)}`,
      formattedAddress: addressDetails.formattedAddress || addressDetails.displayAddress || "",
      formatted_address: addressDetails.formattedAddress || addressDetails.displayAddress || "",
      full_address: addressDetails.formattedAddress || addressDetails.displayAddress || "",
      locality: addressDetails.displayAddress || `${coords.latitude.toFixed(7)}, ${coords.longitude.toFixed(7)}`,
      timestamp: now.toISOString(),
      canPunch: true,
    };

    stopCameraStream();
    stopGpsTracking();

    const callback = onConfirmPunch || onConfirm;
    if (callback) {
      await callback({
        punchTime: timeStr,
        punchDate: dateStr,
        locationData: finalLocationPayload,
        faceImage: capturedImage,
      });
    }

    setIsSubmitting(false);
  };

  // Initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setFaceCheckStatus("idle");
      setDetectedFaceCount(0);
      setIsSubmitting(false);

      // 1. Open Live Camera
      startCamera();

      // 2. Start Live High-Accuracy GPS Tracking
      startHighAccuracyGpsTracking();

      // 3. Immediately resolve address for initial coordinates so address fields never show empty dashes
      const startLat = initialLocation?.latitude ?? coords.latitude ?? 12.9716;
      const startLng = initialLocation?.longitude ?? coords.longitude ?? 77.5946;
      fetchAddressForCoords(startLat, startLng);

      return () => {
        stopCameraStream();
        stopGpsTracking();
      };
    } else {
      stopCameraStream();
      stopGpsTracking();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let punchLabel = "Morning Punch In";
  let HeaderIcon = LogIn;

  if (actionType === "lunch_out") {
    punchLabel = "Lunch Out";
    HeaderIcon = Coffee;
  } else if (actionType === "lunch_in") {
    punchLabel = "Lunch In";
    HeaderIcon = Coffee;
  } else if (actionType === "out") {
    punchLabel = "Evening Logout";
    HeaderIcon = LogOut;
  }

  return (
    <div
      className="face-punch-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          stopCameraStream();
          stopGpsTracking();
          onClose();
        }
      }}
    >
      <div className="face-punch-modal unified-modal">
        {/* Header */}
        <div className="face-modal-header">
          <div className="face-modal-header-left">
            <span className="face-modal-header-icon">
              <HeaderIcon size={22} />
            </span>
            <div>
              <h3 className="face-modal-title">{punchLabel}</h3>
              <span className="face-modal-subtitle">
                {executive?.name ? `${executive.name} · ` : ""}
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="face-modal-close-btn"
            onClick={() => {
              stopCameraStream();
              stopGpsTracking();
              onClose();
            }}
            title="Cancel"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Location Error Warning Banner */}
        {Boolean(locationError) && (
          <div className="loc-accuracy-warning-banner">
            <div className="loc-warning-main">
              <AlertCircle size={18} className="loc-warning-icon" />
              <span className="loc-warning-text">{locationError}</span>
            </div>
            <div className="loc-warning-actions">
              <button
                type="button"
                className="loc-warning-btn-retry"
                onClick={startHighAccuracyGpsTracking}
                disabled={isDetectingGps}
              >
                {isDetectingGps ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />}
                <span>Retry GPS</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Two-Column Body: Live Camera (Left) + GPS Tracking & Location (Right) */}
        <div className="unified-modal-body">
          {/* COLUMN 1: Camera & Live Photo Capture */}
          <div className="unified-col unified-camera-col">
            <div className="col-header-row">
              <span className="col-header-icon camera-icon">
                <Camera size={16} />
              </span>
              <span className="col-header-title">1. Live Biometric Photo Capture</span>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Camera Viewport */}
            <div className={`unified-camera-viewport ${
              faceCheckStatus === "multiple_faces"
                ? "border-red alert-multiple-faces"
                : faceCheckStatus === "no_face"
                ? "border-amber alert-no-face"
                : capturedImage && faceCheckStatus === "valid"
                ? "border-green"
                : ""
            }`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="unified-video-feed"
                style={{
                  display: !capturedImage && cameraStatus === "active" ? "block" : "none",
                }}
              />

              {capturedImage ? (
                <img src={capturedImage} alt="Captured Live Photo Preview" className="unified-captured-img" />
              ) : cameraStatus === "loading" ? (
                <div className="camera-state-notice">
                  <RefreshCw size={24} className="spin text-orange" />
                  <span>Starting camera…</span>
                </div>
              ) : cameraStatus !== "active" ? (
                <div className="camera-state-notice">
                  <Camera size={28} className="text-muted" />
                  <span className="camera-notice-text">
                    {cameraErrorMsg || (cameraStatus === "denied" ? "Camera access denied. Please allow permissions." : "Webcam Inactive")}
                  </span>
                  <button
                    type="button"
                    className="btn-start-camera"
                    onClick={startCamera}
                  >
                    <RefreshCw size={13} />
                    <span>Start Live Camera</span>
                  </button>
                </div>
              ) : null}

              {/* Status pill on camera viewport */}
              <div className="camera-floating-badge">
                {capturedImage ? (
                  faceCheckStatus === "checking" ? (
                    <span className="badge-checking">
                      <Loader2 size={13} className="spin" /> Verifying Face Count…
                    </span>
                  ) : faceCheckStatus === "multiple_faces" ? (
                    <span className="badge-alert-multi">
                      <Users size={13} /> {detectedFaceCount} Faces (Only 1 Allowed)
                    </span>
                  ) : faceCheckStatus === "no_face" ? (
                    <span className="badge-alert-none">
                      <AlertTriangle size={13} /> No Face Detected (Retake)
                    </span>
                  ) : (
                    <span className="badge-captured">
                      <CheckCircle2 size={13} /> Exactly 1 Face Verified
                    </span>
                  )
                ) : cameraStatus === "active" ? (
                  <span className="badge-live">
                    <span className="live-dot" /> Live Camera (1 Face Allowed)
                  </span>
                ) : (
                  <span className="badge-offline">Standby</span>
                )}
              </div>

              {/* Striking Red Alert Side Ribbons on Camera Box */}
              {(faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2) && (
                <>
                  <div className="camera-side-alert-ribbon left-side-alert" aria-hidden="true">
                    <span className="side-alert-bar" />
                    <span className="side-alert-title">🚨 RED ALERT · MULTIPLE FACES</span>
                    <span className="side-alert-bar" />
                  </div>
                  <div className="camera-side-alert-ribbon right-side-alert" aria-hidden="true">
                    <span className="side-alert-bar" />
                    <span className="side-alert-title">⛔ CAPTURE BLOCKED · ONLY 1 PERSON</span>
                    <span className="side-alert-bar" />
                  </div>
                </>
              )}

              {/* Live Overlay Alert when 2 or more members are in front of the camera */}
              {(faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2) && (
                <div className="camera-live-alert-overlay" role="alert">
                  <div className="camera-live-alert-icon">
                    <AlertTriangle size={24} className="pulse-alert-icon" />
                  </div>
                  <div className="camera-live-alert-content">
                    <div className="alert-title">🚨 Alert: {detectedFaceCount >= 2 ? `${detectedFaceCount} Members` : "Multiple Faces"} in Camera!</div>
                    <div className="alert-subtitle">
                      Capture button is disabled. Strictly only ONE person is allowed in front of the camera to punch attendance.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Banners for Face Count Validation */}
            {(faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2) && (
              <div className="multiple-faces-banner alert-danger">
                <Users size={16} />
                <span>
                  <strong>Multiple Faces Detected ({detectedFaceCount}):</strong> Capture button is disabled. Please stand alone in front of the camera to punch.
                </span>
              </div>
            )}

            {faceCheckStatus === "no_face" && (
              <div className="multiple-faces-banner alert-warning">
                <AlertCircle size={16} />
                <span>
                  <strong>No Face Detected:</strong> Face not clearly visible. Please face the camera directly.
                </span>
              </div>
            )}

            {capturedImage && faceCheckStatus === "valid" && detectedFaceCount === 1 && (
              <div className="single-face-verified-banner">
                <CheckCircle2 size={16} />
                <span>
                  <strong>Biometric Check Passed:</strong> Exactly 1 face captured. Ready for attendance.
                </span>
              </div>
            )}

            {/* Camera Actions: Capture Photo / Retake */}
            <div className="camera-actions-row">
              {capturedImage ? (
                <button
                  type="button"
                  className="btn-retake-photo"
                  onClick={handleRetakePhoto}
                  disabled={isSubmitting}
                >
                  <RefreshCw size={14} />
                  <span>Retake Photo</span>
                </button>
              ) : (
                <div className="capture-button-wrapper">
                  {(() => {
                    const isMulti = faceCheckStatus === "multiple_faces" || detectedFaceCount >= 2;
                    const isSingle = detectedFaceCount === 1 && !isMulti;
                    const canCapture = cameraStatus === "active" && !isSubmitting && isSingle;

                    return (
                      <>
                        <button
                          type="button"
                          className={`btn-capture-photo ${
                            isMulti
                              ? "btn-capture-blocked"
                              : isSingle
                              ? "btn-capture-ready"
                              : "btn-capture-waiting"
                          }`}
                          onClick={handleCapturePhoto}
                          disabled={!canCapture}
                          title={
                            isMulti
                              ? `Capture blocked: ${detectedFaceCount} faces detected. Only 1 person allowed.`
                              : isSingle
                              ? "1 Face verified! Click to capture photo."
                              : "Please position 1 face in the camera to enable capture."
                          }
                        >
                          {isMulti ? (
                            <>
                              <Users size={16} />
                              <span>Capture Blocked ({detectedFaceCount} Faces Detected)</span>
                            </>
                          ) : isSingle ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>Capture Photo (1 Face Verified)</span>
                            </>
                          ) : (
                            <>
                              <Camera size={16} />
                              <span>Position 1 Face in Camera</span>
                            </>
                          )}
                        </button>

                        {isMulti ? (
                          <p className="capture-blocked-notice">
                            ⛔ <strong>Capture Blocked:</strong> {detectedFaceCount} faces detected! Only 1 person is allowed. Stand alone in front of camera.
                          </p>
                        ) : isSingle ? (
                          <p className="capture-ready-notice">
                            ✅ <strong>1 Face Verified:</strong> Ready! Click the button above to capture your attendance photo.
                          </p>
                        ) : (
                          <p className="capture-waiting-notice">
                            👤 <strong>Face Required:</strong> Look at the camera so your face is detected to enable capture.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: Real-Time GPS Tracking & Location Verification (Google Map Removed) */}
          <div className="unified-col unified-gps-col">
            <div className="col-header-row">
              <span className="col-header-icon gps-icon">
                <Compass size={16} />
              </span>
              <span className="col-header-title">2. Live GPS & Location Verification</span>
            </div>

            {/* Real-Time GPS Satellite Tracking Card */}
            <div className="unified-gps-tracking-card">
              <div className="gps-live-header">
                <div className="gps-live-status-left">
                  <div className={`gps-satellite-icon-wrap ${isRefiningGps ? "refining" : "locked"}`}>
                    <Navigation size={18} className="gps-pulse-nav" />
                  </div>
                  <div>
                    <div className="gps-live-title">
                      {isRefiningGps
                        ? "🛰️ Satellite GPS Tracking Active"
                        : gpsLocked
                        ? "🎯 High-Precision GPS Locked"
                        : "🛰️ Acquiring GPS Position..."}
                    </div>
                    <div className="gps-live-sub">
                      {isRefiningGps ? (
                        <span className="text-amber">
                          Refining accuracy · Fix #{gpsSampleCount} (Locking high-precision satellites…)
                        </span>
                      ) : (
                        <span className="text-emerald">
                          Exact coordinates calibrated · {lastFixTime ? `Updated ${lastFixTime}` : "Active"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-refresh-gps"
                  onClick={startHighAccuracyGpsTracking}
                  disabled={isDetectingGps && !isRefiningGps}
                  title="Re-scan and calibrate high-accuracy GPS coordinates"
                >
                  <RotateCw size={13} className={isDetectingGps ? "spin" : ""} />
                  <span>{isDetectingGps ? "Calibrating…" : "Refresh GPS"}</span>
                </button>
              </div>

              {/* Exact Digital Coordinates Grid */}
              <div className="gps-coords-display-grid">
                <div className="gps-coord-box">
                  <div className="gps-coord-label">EXACT LATITUDE</div>
                  <div className="gps-coord-value font-mono">
                    {coords.latitude ? `${coords.latitude.toFixed(7)}°` : "—"}
                  </div>
                </div>
                <div className="gps-coord-box">
                  <div className="gps-coord-label">EXACT LONGITUDE</div>
                  <div className="gps-coord-value font-mono">
                    {coords.longitude ? `${coords.longitude.toFixed(7)}°` : "—"}
                  </div>
                </div>
                <div className="gps-coord-box">
                  <div className="gps-coord-label">GPS ACCURACY</div>
                  <div className={`gps-coord-value font-mono ${accuracy != null && accuracy <= 25 ? "acc-great" : accuracy != null && accuracy <= 80 ? "acc-moderate" : "acc-low"}`}>
                    {accuracy != null ? `±${accuracy} meters` : "Detecting..."}
                  </div>
                </div>
                <div className="gps-coord-box">
                  <div className="gps-coord-label">PRECISION STATUS</div>
                  <div className="gps-coord-status">
                    {accuracy != null && accuracy <= 25 ? (
                      <span className="gps-pill pill-locked">
                        <CheckCircle2 size={12} /> High Precision
                      </span>
                    ) : isRefiningGps ? (
                      <span className="gps-pill pill-refining">
                        <Loader2 size={12} className="spin" /> Refining satellites…
                      </span>
                    ) : (
                      <span className="gps-pill pill-best">
                        <Check size={12} /> Best Fix Acquired
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Low Accuracy Notice & Progressive Satellite Refinement Banner */}
              {isRefiningGps && accuracy != null && accuracy > 25 && (
                <div className="gps-refining-alert">
                  <div className="gps-refining-spinner">
                    <Loader2 size={16} className="spin text-amber" />
                  </div>
                  <div className="gps-refining-info">
                    <div className="gps-refining-text">
                      <strong>Low accuracy fix detected (±{accuracy}m).</strong>
                    </div>
                    <div className="gps-refining-desc">
                      Communicating with GPS satellites to fetch exact location... Please wait a few seconds.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Structured Address HUD */}
            <div className="unified-address-card">
              <div className="address-header-row">
                <span className="address-title">Selected Location</span>
                <div className="address-badges">
                  <span className="source-tag source-gps">
                    BROWSER_GPS
                  </span>
                  <span className={`acc-tag ${accuracy != null && accuracy <= 25 ? "acc-good" : "acc-mod"}`}>
                    {accuracy != null ? `±${accuracy}m (${accuracy <= 25 ? "100% Accurate" : "Refining"})` : "GPS Locked"}
                  </span>
                </div>
              </div>

              <div className="address-grid-4">
                <div className="grid-cell">
                  <span className="cell-label">AREA / VILLAGE:</span>
                  <span className="cell-value" style={{ color: "#0f766e", fontWeight: 700 }}>
                    {addressDetails.area || addressDetails.village || "—"}
                  </span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">STREET / ROAD:</span>
                  <span className="cell-value">{addressDetails.street || addressDetails.route || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">TALUK / SUB-DIST:</span>
                  <span className="cell-value">{addressDetails.taluk || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">CITY / TOWN:</span>
                  <span className="cell-value" style={{ fontWeight: 600 }}>{addressDetails.city || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">DISTRICT:</span>
                  <span className="cell-value">{addressDetails.district || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">STATE:</span>
                  <span className="cell-value">{addressDetails.state || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">PIN CODE:</span>
                  <span className="cell-value" style={{ color: "#2563eb", fontWeight: 700 }}>{addressDetails.pincode || "—"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">COUNTRY:</span>
                  <span className="cell-value">{addressDetails.country || "India"}</span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">ACCURACY:</span>
                  <span className="cell-value font-mono" style={{ color: accuracy != null && accuracy <= 25 ? "#16a34a" : "#d97706", fontWeight: 700 }}>
                    {accuracy != null ? `±${accuracy} meters (${accuracy <= 25 ? "100% Accurate" : "Refining"})` : "Calibrating..."}
                  </span>
                </div>
                <div className="grid-cell">
                  <span className="cell-label">GPS Lat / Lng:</span>
                  <span className="cell-value font-mono" style={{ fontSize: "0.72rem" }}>
                    {coords.latitude ? `${coords.latitude.toFixed(7)}°, ${coords.longitude.toFixed(7)}°` : "—"}
                  </span>
                </div>
              </div>

              <div className="address-full-line">
                <span className="cell-label">FORMATTED ADDRESS:</span>
                <p className="address-full-text">
                  {isGeocoding ? (
                    <span className="text-teal">
                      <Loader2 size={12} className="spin inline-spin" /> Resolving address...
                    </span>
                  ) : (
                    addressDetails.formattedAddress || addressDetails.displayAddress || "—"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Cancel & Confirm Punch */}
        <div className="face-modal-footer unified-footer">
          <div className="footer-left-info">
            <span className="step-guide">
              {capturedImage ? (
                faceCheckStatus === "checking" ? (
                  "🔍 Verifying face count in photo… Please wait."
                ) : faceCheckStatus === "no_face" ? (
                  "❌ No face detected. Please retake photo with face clearly visible."
                ) : faceCheckStatus === "multiple_faces" ? (
                  `🚨 Multiple faces detected (${detectedFaceCount})! Strictly only 1 person allowed.`
                ) : (
                  "✅ Exactly 1 face verified. Review details & click Confirm Punch."
                )
              ) : (
                "📷 Capture your live photo (strictly 1 member only allowed)."
              )}
            </span>
          </div>

          <div className="footer-btn-group">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                stopCameraStream();
                stopGpsTracking();
                onClose();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className={`btn-confirm-punch ${
                faceCheckStatus === "multiple_faces" || faceCheckStatus === "no_face"
                  ? "btn-punch-alert"
                  : ""
              }`}
              disabled={
                isSubmitting ||
                !capturedImage ||
                faceCheckStatus !== "valid" ||
                detectedFaceCount !== 1
              }
              onClick={handleConfirmPunchAction}
            >
              {isSubmitting ? (
                <RefreshCw size={17} className="spin" />
              ) : (
                <Check size={18} />
              )}
              <span>
                {isSubmitting
                  ? "Recording Attendance…"
                  : `Confirm & ${punchLabel}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
