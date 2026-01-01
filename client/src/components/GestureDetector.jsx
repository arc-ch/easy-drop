import { useEffect, useRef, useState } from "react";

const GestureDetector = ({ onGesture }) => {

  // url of the teachable machine model
  const MODEL_URL = "https://teachablemachine.withgoogle.com/models/sG3DX3BM_/model.json";

  // reference to the hidden video element
  const videoRef = useRef();

  // tells us if the webcam has already started
  const [isVideoStarted, setIsVideoStarted] = useState(false);

  // will hold the loaded ml model
  const [classifier, setClassifier] = useState(null);

  // runs once when component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        // load the image classifier
        const loadedClassifier = await window.ml5.imageClassifier(
          MODEL_URL,
          () => {
            console.log("gesture model loaded");
          }
        );

        // save model in state so other parts can use it
        setClassifier(loadedClassifier);
      } catch (error) {
        // if model fails to load, log the error
        console.error("model loading failed: ", error);
      }
    };

    // start loading the model
    loadModel();
  }, []);

  // this function keeps running again and again
  const classifyGesture = () => {

    // if both model and video are ready, we can classify frames
    if (classifier && videoRef.current) {
      classifier.classify(videoRef.current, (results, error) => {

        // if classification throws an error, stop this cycle
        if (error) {
          console.error("classification error: ", error);
          return;
        }

        // if results exist, take the top prediction
        if (results && results[0]) {
          onGesture(results[0].label, results[0].confidence);
        }

        // after one prediction, call classify again
        setTimeout(() => classifyGesture(), 30);
      });
    } else {
      // if model or video is not ready yet, wait and retry
      setTimeout(() => classifyGesture(), 30);
    }
  };

  // starts the webcam
  const startVideo = () => {

    // check if browser supports webcam access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {

          // if video element exists, attach the webcam stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream;

            // wait until video metadata is loaded
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();

              // mark video as started
              setIsVideoStarted(true);

              // once video is live, start classification loop
              classifyGesture();
            };
          }
        })
        .catch((error) => {
          // error when user blocks camera or something fails
          console.error("error accessing the camera: ", error);
        });
    }
  };

  // watches for when the model becomes available
  useEffect(() => {

    // if model is ready and webcam has not started yet
    if (classifier && !isVideoStarted) {
      startVideo();
    }
  }, [classifier]);

  // hidden video element used only for feeding frames to the model
  return (
    <video
      ref={videoRef}
      width={640}
      height={480}
      style={{ display: "none" }}
      autoPlay
      muted
    />
  );
};

export default GestureDetector;
