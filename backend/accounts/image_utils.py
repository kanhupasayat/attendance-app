from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys


def compress_image(image_file, max_size=(800, 800), quality=70):
    """
    Compress and resize an image to reduce file size.

    Args:
        image_file: Django uploaded file
        max_size: Maximum dimensions (width, height)
        quality: JPEG quality (1-100)

    Returns:
        Compressed InMemoryUploadedFile
    """
    if not image_file:
        return image_file

    try:
        # Open image
        img = Image.open(image_file)

        # Convert to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Calculate new size maintaining aspect ratio
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Save to BytesIO
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        # Get original filename and create new filename
        original_name = image_file.name if hasattr(image_file, 'name') else 'image.jpg'
        if '.' in original_name:
            name_without_ext = original_name.rsplit('.', 1)[0]
        else:
            name_without_ext = original_name
        new_name = f"{name_without_ext}.jpg"

        # Create new InMemoryUploadedFile
        compressed_file = InMemoryUploadedFile(
            output,
            'ImageField',
            new_name,
            'image/jpeg',
            sys.getsizeof(output),
            None
        )

        return compressed_file

    except Exception as e:
        print(f"Image compression failed: {e}")
        # Return original file if compression fails
        return image_file


def compress_profile_photo(image_file):
    """Compress profile photo - smaller size"""
    return compress_image(image_file, max_size=(400, 400), quality=75)


def compress_document_photo(image_file):
    """Compress document photos (Aadhaar, PAN) - slightly larger for readability"""
    return compress_image(image_file, max_size=(1000, 1000), quality=80)
