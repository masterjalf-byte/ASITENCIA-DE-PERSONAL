import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
}

const videoConstraints = {
  width: 720,
  height: 720,
  facingMode: "user"
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const retake = () => {
    setImage(null);
    onCapture('');
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full">
      <div className="relative w-full max-w-md aspect-square bg-blue-950 rounded-2xl overflow-hidden shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] border-4 border-blue-400">
        {!image ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
            disablePictureInPicture={false}
            forceScreenshotSourceSize={true}
            imageSmoothing={true}
            mirrored={false}
            minScreenshotHeight={720}
            minScreenshotWidth={720}
            screenshotQuality={0.92}
            onUserMedia={() => {}}
            onUserMediaError={() => {}}
          />
        ) : (
          <img src={image} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex space-x-4 w-full justify-center">
        {!image ? (
          <button
            onClick={(e) => { e.preventDefault(); capture(); }}
            className="flex items-center justify-center px-6 py-4 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_6px_0_#1e3a8a] hover:shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all"
          >
            <Camera className="w-6 h-6 mr-2" />
            TOMAR FOTO
          </button>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); retake(); }}
            className="flex items-center justify-center px-6 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black uppercase tracking-widest shadow-[0_6px_0_#b45309] hover:shadow-[0_4px_0_#b45309] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all"
          >
            <RefreshCw className="w-6 h-6 mr-2" />
            RETOMAR
          </button>
        )}
      </div>
      {image && (
        <div className="flex items-center text-green-300 text-sm font-black uppercase bg-blue-900/50 px-4 py-2 rounded-lg border border-green-400/30 shadow-inner">
          <CheckCircle className="w-5 h-5 mr-2" />
          FOTO CAPTURADA
        </div>
      )}
    </div>
  );
};
