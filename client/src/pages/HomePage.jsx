import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

/* =====================
   important constants
   ===================== */

// cooldown so grab gesture doesn't spam uploads
// gesture model runs every frame
const GRAB_COOLDOWN = 10000;

// temp user id sent to backend
// can be replaced later with auth
const USER_ID = "id1";

// backend that stores the image
const API_URL = "https://grab-and-drop.onrender.com";

// ignore low-confidence grabs
// prevents random hand noise uploads
const CONFIDENCE_THRESHOLD = 0.7;

const HomePage = ({ currentGesture, gestureConfidence }) => {
  /* =====================
     state
     ===================== */

  // actual image file from input
  const [selectedImage, setSelectedImage] = useState(null);

  // base64 preview for ui only
  const [imagePreview, setImagePreview] = useState(null);

  // true while upload + animation is running
  // acts like a lock
  const [isGrabbing, setIsGrabbing] = useState(false);

  // once true, same image cannot be uploaded again
  const [hasGrabbed, setHasGrabbed] = useState(false);

  /* =====================
     refs (no re-render)
     ===================== */

  // last successful grab time
  // used to enforce cooldown
  const lastGrabTime = useRef(0);

  /* =====================
     core upload logic
     ===================== */

  const handleGrab = async () => {
    // double safety check
    if (!selectedImage || isGrabbing) return;

    // start cooldown immediately
    lastGrabTime.current = Date.now();
    setIsGrabbing(true);

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("userId", USER_ID);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        // permanently block re-upload for this image
        setHasGrabbed(true);

        // let animation finish before unlock
        setTimeout(() => {
          setIsGrabbing(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      // fail-safe unlock
      setIsGrabbing(false);
      setHasGrabbed(false);
    }
  };

  /* =====================
     gesture trigger (brain)
     ===================== */

  useEffect(() => {
    const timeSinceLastGrab = Date.now() - lastGrabTime.current;

    // all conditions must pass
    // this prevents spam, noise and duplicates
    if (
      currentGesture === "grab" &&
      gestureConfidence > CONFIDENCE_THRESHOLD &&
      selectedImage &&
      !isGrabbing &&
      !hasGrabbed &&
      timeSinceLastGrab > GRAB_COOLDOWN
    ) {
      handleGrab();
    }
  }, [
    currentGesture,
    gestureConfidence,
    selectedImage,
    isGrabbing,
    hasGrabbed,
  ]);

  /* =====================
     image selection
     ===================== */

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(file);

    // reset grab system for new image
    setHasGrabbed(false);
    lastGrabTime.current = 0;

    // generate preview (not sent to backend)
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /* =====================
     ui
     ===================== */

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {!imagePreview ? (
        // no image selected yet
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Image Transfer
          </h1>

          <p className="text-gray-600 mb-6 text-center">
            select an image, then make a <strong>grab</strong> gesture
          </p>

          {/* image picker */}
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100">
            <Upload className="w-16 h-16 text-indigo-400 mb-4" />
            <span className="text-sm text-gray-600">
              click to select image
            </span>
            <input
              type="file"
              className="hidden"
              accept="images/*"
              onChange={handleImageSelect}
            />
          </label>

          <Link
            to="/drop"
            className="mt-6 block text-gray-600 underline text-xs text-center"
          >
            go to drop page
          </Link>
        </div>
      ) : (
        // image selected
        <div className="relative w-full h-screen">
          <img
            src={imagePreview}
            alt="selected"
            className="w-full h-full object-contain"
          />

          {/* grab feedback animation */}
          {isGrabbing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-ping absolute w-96 h-96 rounded-full bg-white/70" />
              <div className="animate-pulse absolute w-64 h-64 rounded-full bg-white/70" />
              <div className="animate-bounce absolute w-32 h-32 rounded-full bg-white/70" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;


// import { useEffect, useRef, useState } from "react";
// import { Upload } from "lucide-react";
// import { Link } from "react-router-dom";

// const GRAB_COOLDOWN = 10000;
// const USER_ID = 'id1';
// const API_URL = 'https://grab-and-drop.onrender.com';
// const CONFIDENCE_THRESHOLD = 0.7;

// const HomePage = ({ currentGesture, gestureConfidence }) => {

//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState(null);
//   const [isGrabbing, setIsGrabbing] = useState(false);
//   const [hasGrabbed, setHasGrabbed] = useState(false);

//   const lastGrabTime = useRef(0);

//   const handleGrab = async () => {
//     if (!selectedImage || isGrabbing) return;

//     lastGrabTime.current = Date.now();
//     setIsGrabbing(true);

//     const formData = new FormData();
//     formData.append('image', selectedImage);
//     formData.append('userId', USER_ID);

//     try {
//       const response = await fetch(`${API_URL}/upload`, {
//         method: "POST",
//         body: formData
//       });
//       const data = await response.json();

//       if (data.success) {
//         setHasGrabbed(true);
//         setTimeout(() => {
//           setIsGrabbing(false);
//         }, 2000);
//       }
//     } catch (error) {
//       console.error(error);
//       setIsGrabbing(false);
//       setHasGrabbed(false);
//     }
//   }

//   useEffect(() => {
//     const timeSinceLastGrab = Date.now() - lastGrabTime.current;

//     if(currentGesture === 'grab' && 
//       gestureConfidence > CONFIDENCE_THRESHOLD &&
//       selectedImage &&
//       !isGrabbing &&
//       !hasGrabbed &&
//       timeSinceLastGrab > GRAB_COOLDOWN
//     ) {
//       handleGrab();
//     }
//   }, [currentGesture, gestureConfidence, selectedImage, isGrabbing, hasGrabbed]);

//   const handleImageSelect = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setSelectedImage(file);
//       setHasGrabbed(false);
//       lastGrabTime.current = 0;

//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setImagePreview(reader.result);
//       }
//       reader.readAsDataURL(file);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
//       {
//         !imagePreview ? (
//           <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
//             <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
//               Image Transfer
//             </h1>
//             <p className="text-gray-600 mb-6 text-center">
//               Select an image, then make a <strong>"GRAB"</strong> gesture
//             </p>

//             <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors bg-indigo-50 hover:bg-indigo-100">
//               <Upload className="w-16 h-16 text-indigo-400 mb-4" />
//               <span className="text-sm text-gray-600">Click to select image</span>
//               <input type="file" className="hidden" accept="images/*" onChange={handleImageSelect} />
//             </label>

//             <Link to={"/drop"} className="mt-6 w-fit flex items-center justify-center gap-2 text-gray-600 underline py-2 text-xs rounded-xl transition-colors">
//               Go to Drop Page
//             </Link>
//           </div>
//         ) : (
//           <div className="relative w-full h-screen">
//             <img src={imagePreview} alt="Selected Image" className="w-full h-full object-contain" />
//             {
//               isGrabbing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
//                   <div className="animate-ping absolute w-96 h-96 rounded-full bg-white opacity-75"></div>
//                   <div className="animate-pulse absolute w-64 h-64 rounded-full bg-white opacity-75"></div>
//                   <div className="animate-bounce absolute w-32 h-32 rounded-full bg-white opacity-75"></div>
//                 </div>
//               )
//             }
//           </div>
//         )
//       }
//     </div>
//   )
// }

// export default HomePage
