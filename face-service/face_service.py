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
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Health check
@app.route("/", methods=["GET"])
def home():
    return "✅ Face Service is Live!", 200

# Resize utility
def resize_image(image_path, max_size=(224, 224)):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            temp_path = os.path.join(tempfile.gettempdir(), f"resized_{uuid.uuid4().hex}.jpg")
            img.save(temp_path, "JPEG", quality=85)
            return temp_path
    except Exception as e:
        logger.error(f"❌ Failed to resize image {image_path}: {str(e)}")
        return None

@app.route("/verify-face", methods=["POST"])
def verify_face():
    logger.info("📥 Received /verify-face request")

    uploaded_file = request.files.get("image")
    if not uploaded_file:
        logger.error("❌ No file uploaded in form-data")
        return jsonify({"error": "No file uploaded"}), 400

    # Save uploaded image
    temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
    uploaded_path = os.path.join(UPLOAD_DIR, temp_filename)
    uploaded_file.save(uploaded_path)
    logger.info(f"🖼 Uploaded image saved: {uploaded_path}")

    resized_uploaded_path = resize_image(uploaded_path)
    if not resized_uploaded_path:
        return jsonify({"error": "Failed to resize uploaded image"}), 400

    try:
        student_images = [
            os.path.join(UPLOAD_DIR, f)
            for f in os.listdir(UPLOAD_DIR)
            if f != temp_filename and f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        logger.info(f"🔍 Found {len(student_images)} student images for comparison")

        for student_path in student_images:
            resized_student = resize_image(student_path)
            if not resized_student:
                logger.warning(f"⚠️ Skipping invalid student image: {student_path}")
                continue

            if not os.path.exists(resized_uploaded_path) or not os.path.exists(resized_student):
                logger.warning("⚠️ One of the images missing before verification")
                continue

            logger.info(f"🧠 Comparing: {resized_uploaded_path} ↔ {resized_student}")

            try:
                result = DeepFace.verify(
                    resized_uploaded_path,
                    resized_student,
                    model_name="VGG-Face",
                    detector_backend="opencv",
                    enforce_detection=False,
                )
                logger.info(f"📊 Result: {result}")

                if result.get("verified"):
                    student_filename = os.path.basename(student_path)
                    logger.info(f"✅ Match found: {student_filename}")
                    return jsonify({"verified": True, "studentImage": student_filename})

            except Exception as e:
                logger.error(f"❌ DeepFace crashed on compare: {e}")

            finally:
                if os.path.exists(resized_student):
                    os.remove(resized_student)

        return jsonify({"verified": False, "message": "Face not recognized"}), 404

    except Exception as e:
        logger.exception("🔥 Unhandled exception in /verify-face")
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(uploaded_path):
            os.remove(uploaded_path)
        if os.path.exists(resized_uploaded_path):
            os.remove(resized_uploaded_path)

# Run app on port 8000 (Render requirement)
if __name__ == "__main__":
    logger.info("🚀 Starting face-service Flask app")
    app.run(host="0.0.0.0", port=8000, threaded=True)
