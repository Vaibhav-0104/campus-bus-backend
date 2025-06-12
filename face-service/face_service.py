# from flask import Flask, request, jsonify
# from deepface import DeepFace
# import os
# import uuid
# import logging
# from PIL import Image
# import tempfile

# app = Flask(__name__)
# UPLOAD_DIR = "uploads"

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Ensure upload directory exists
# if not os.path.exists(UPLOAD_DIR):
#     os.makedirs(UPLOAD_DIR)
#     logger.info(f"Created upload directory: {UPLOAD_DIR}")

# def resize_image(image_path, max_size=(224, 224)):
#     """Resize image to reduce memory usage."""
#     try:
#         with Image.open(image_path) as img:
#             img = img.convert("RGB")  # Ensure image is in RGB format
#             img.thumbnail(max_size, Image.Resampling.LANCZOS)
#             temp_path = os.path.join(tempfile.gettempdir(), f"resized_{uuid.uuid4().hex}.jpg")
#             img.save(temp_path, "JPEG", quality=85)
#             logger.info(f"Resized image saved to {temp_path}")
#             return temp_path
#     except Exception as e:
#         logger.error(f"Error resizing image {image_path}: {str(e)}")
#         return None

# @app.route('/verify-face', methods=['POST'])
# def verify_face():
#     logger.info("Received POST request to /verify-face")
#     try:
#         uploaded_file = request.files.get("image")
#         if not uploaded_file:
#             logger.error("No file uploaded in request. Request files: %s", request.files)
#             return jsonify({"error": "No file uploaded"}), 400

#         # Generate a unique filename to avoid conflicts
#         temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
#         uploaded_path = os.path.join(UPLOAD_DIR, temp_filename)
#         uploaded_file.save(uploaded_path)
#         logger.info(f"Saved uploaded image to {uploaded_path}")

#         # Resize uploaded image
#         resized_uploaded_path = resize_image(uploaded_path)
#         if not resized_uploaded_path:
#             logger.error("Failed to resize uploaded image")
#             return jsonify({"error": "Invalid or corrupted uploaded image"}), 400

#         try:
#             student_images = [
#                 os.path.join(UPLOAD_DIR, f)
#                 for f in os.listdir(UPLOAD_DIR)
#                 if f != temp_filename and f.lower().endswith(('.jpg', '.jpeg', '.png'))
#             ]
#             logger.info(f"Found {len(student_images)} student images to compare")

#             for image_path in student_images:
#                 try:
#                     # Resize student image
#                     resized_student_path = resize_image(image_path)
#                     if not resized_student_path:
#                         logger.warning(f"Skipping invalid or corrupted student image: {image_path}")
#                         continue

#                     try:
#                         result = DeepFace.verify(
#                             resized_uploaded_path,
#                             resized_student_path,
#                             model_name="VGG-Face",
#                             enforce_detection=False,
#                             detector_backend="opencv",
#                         )
#                         if result["verified"]:
#                             student_filename = os.path.basename(image_path)
#                             logger.info(f"Face verified with student image: {student_filename}")
#                             return jsonify({"verified": True, "studentImage": student_filename})
#                     finally:
#                         # Clean up resized student image
#                         if resized_student_path and os.path.exists(resized_student_path):
#                             os.remove(resized_student_path)
#                             logger.info(f"Cleaned up resized student image: {resized_student_path}")
#                 except Exception as e:
#                     logger.warning(f"Error comparing with {image_path}: {str(e)}")
#                     continue

#             logger.info("No matching face found")
#             return jsonify({"verified": False, "message": "Face not recognized"}), 404

#         finally:
#             # Clean up the temporary uploaded file and resized uploaded image
#             if os.path.exists(uploaded_path):
#                 os.remove(uploaded_path)
#                 logger.info(f"Cleaned up temporary file: {uploaded_path}")
#             if resized_uploaded_path and os.path.exists(resized_uploaded_path):
#                 os.remove(resized_uploaded_path)
#                 logger.info(f"Cleaned up resized uploaded image: {resized_uploaded_path}")

#     except Exception as e:
#         logger.error(f"Error in verify_face: {str(e)}", exc_info=True)
#         return jsonify({"error": str(e)}), 500

# if __name__ == '__main__':
#     logger.info("Starting face recognition service")
#     app.run(host='0.0.0.0', port=5001, threaded=True)


from flask import Flask, request, jsonify
from deepface import DeepFace
import os
import uuid
import logging
from PIL import Image
import tempfile

app = Flask(__name__)
UPLOAD_DIR = "uploads"

# ✅ Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Ensure uploads folder exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ Health check route
@app.route("/", methods=["GET"])
def home():
    return "✅ Face Service is Live!"

# ✅ Resize image
def resize_image(image_path, max_size=(224, 224)):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            temp_path = os.path.join(tempfile.gettempdir(), f"resized_{uuid.uuid4().hex}.jpg")
            img.save(temp_path, "JPEG", quality=85)
            return temp_path
    except Exception as e:
        logger.error(f"Image resize failed: {e}")
        return None

# ✅ Save student image from Node backend
@app.route("/save-student-image", methods=["POST"])
def save_student_image():
    uploaded_file = request.files.get("image")
    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    save_path = os.path.join(UPLOAD_DIR, uploaded_file.filename)
    uploaded_file.save(save_path)
    logger.info(f"✅ Saved student image: {save_path}")
    return jsonify({"message": "Image saved successfully"}), 200

# ✅ Main face verification
@app.route("/verify-face", methods=["POST"])
def verify_face():
    uploaded_file = request.files.get("image")
    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
    uploaded_path = os.path.join(UPLOAD_DIR, temp_filename)
    uploaded_file.save(uploaded_path)

    resized_uploaded_path = resize_image(uploaded_path)
    if not resized_uploaded_path:
        return jsonify({"error": "Invalid uploaded image"}), 400

    try:
        student_images = [
            os.path.join(UPLOAD_DIR, f)
            for f in os.listdir(UPLOAD_DIR)
            if f.lower().endswith(('.jpg', '.jpeg', '.png')) and f != temp_filename
        ]

        for student_path in student_images:
            resized_student = resize_image(student_path)
            if not resized_student:
                continue

            try:
                result = DeepFace.verify(
                    resized_uploaded_path,
                    resized_student,
                    model_name="VGG-Face",
                    detector_backend="opencv",
                    enforce_detection=False,
                )
                if result.get("verified"):
                    student_filename = os.path.basename(student_path)
                    return jsonify({"verified": True, "studentImage": student_filename})
            finally:
                if os.path.exists(resized_student):
                    os.remove(resized_student)

        return jsonify({"verified": False, "message": "Face not recognized"}), 404

    except Exception as e:
        logger.exception("Face verification failed")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(uploaded_path):
            os.remove(uploaded_path)
        if resized_uploaded_path and os.path.exists(resized_uploaded_path):
            os.remove(resized_uploaded_path)

if __name__ == "__main__":
    logger.info("🚀 Starting Flask face-service")
    PORT = int(os.environ.get("PORT", 8000))  # Render sets PORT env var
    app.run(host="0.0.0.0", port=PORT, threaded=True)
