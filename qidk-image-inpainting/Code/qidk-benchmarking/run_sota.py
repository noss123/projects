import os
import requests
from tqdm import tqdm
from pathlib import Path
import argparse

# --- Configuration ---
# 1. SET YOUR API KEY HERE
# Get your key from: https://clipdrop.co/platform/account
API_KEY = "3d92d14ebd5931e6156660698ff0f6a409303ff2ef31ea6cbd16678e6d31c5eb2445669368a130f4f79a37e86b001f50"

# 2. CONFIGURE YOUR DIRECTORIES
# The script will read images and masks from these folders.
IMAGE_DIR = "sample_dataset/image_with_object"
MASK_DIR = "sample_dataset/masked_image"

# 3. CONFIGURE API PARAMETERS
# 'quality' is slower but gives better results (HD mode). Use 'fast' for quicker tests.
PROCESSING_MODE = "quality"
# Limit the number of images to process per run to save credits.
IMAGE_LIMIT = 100

# --- Script Logic ---
def get_next_run_dir():
    """Finds the next available 'SOTA_X' directory number."""
    base_path = "inpainted_images"
    os.makedirs(base_path, exist_ok=True)
    run_num = 1
    while os.path.exists(os.path.join(base_path, f"SOTA_{run_num}")):
        run_num += 1
    return os.path.join(base_path, f"SOTA_{run_num}")

def call_clipdrop_api(image_path, mask_path):
    """
    Sends an image and a mask to the ClipDrop Cleanup API.
    
    Args:
        image_path (str): Path to the source image.
        mask_path (str): Path to the mask image.

    Returns:
        tuple: A tuple containing the inpainted image content (bytes) and a
               dictionary of relevant response headers, or (None, None) on failure.
    """
    if not API_KEY or API_KEY == "YOUR_CLIPDROP_API_KEY_HERE":
        print("🛑 ERROR: API_KEY is not set. Please add your key to the script.")
        return None, None

    try:
        response = requests.post(
            'https://clipdrop-api.co/cleanup/v1',
            files={
                'image_file': (Path(image_path).name, open(image_path, 'rb'), 'image/png'),
                'mask_file': (Path(mask_path).name, open(mask_path, 'rb'), 'image/png')
            },
            data={
                'mode': PROCESSING_MODE
            },
            headers={
                'x-api-key': API_KEY
            }
        )
        response.raise_for_status()
        
        # Extract useful headers before returning
        headers = {
            'credits_consumed': response.headers.get('x-credits-consumed'),
            'remaining_credits': response.headers.get('x-remaining-credits')
        }
        
        return response.content, headers

    except requests.exceptions.RequestException as e:
        print(f"\nAPI Error for {Path(image_path).name}: {e}")
        # Print detailed error from API if available
        if e.response is not None:
            try:
                print(f"Server Response: {e.response.json()}")
            except ValueError:
                print(f"Server Response: {e.response.text}")
        return None, None

def main():
    """
    Main function to find image-mask pairs, call the API, and save results.
    """
    parser = argparse.ArgumentParser(description="Run ClipDrop inpainting on dataset images")
    parser.add_argument("--mode", choices=["every10", "range"], default="every10", help="every10 = process every 10th image (old behavior); range = process a serial range")
    parser.add_argument("--start", type=int, default=1, help="Start serial (inclusive) for range mode, e.g., 1 for 0001")
    parser.add_argument("--end", type=int, default=78, help="End serial (inclusive) for range mode, e.g., 78 for 0078")
    args = parser.parse_args()

    # --- Interactive selection override ---
    print("Select image selection mode:")
    print("  1) every10  - process every 10th image (old behavior, up to IMAGE_LIMIT)")
    print("  2) range    - process a serial range (e.g., 0001..0078)")
    choice = input("Enter 1 or 2 [1]: ").strip()
    if choice == "2":
        selection_mode = "range"
        try:
            start_str = input(f"Start serial [default {args.start:04d}]: ").strip()
            end_str = input(f"End serial   [default {args.end:04d}]: ").strip()
            start_serial = int(start_str) if start_str else args.start
            end_serial = int(end_str) if end_str else args.end
        except ValueError:
            print("Invalid input. Falling back to defaults 0001..0078.")
            start_serial, end_serial = 1, 78
    else:
        selection_mode = "every10"
        start_serial, end_serial = args.start, args.end
    
    output_dir = get_next_run_dir()
    os.makedirs(output_dir)

    print("🚀 Starting ClipDrop Inpainting Process...")
    print(f"✨ API Mode: '{PROCESSING_MODE}'")
    print(f"🛠 Selection Mode: '{selection_mode}'")
    if selection_mode == "range":
        print(f"🔢 Serial range: {start_serial:04d}–{end_serial:04d}")
    print(f"💾 Output will be saved to: {output_dir}")

    image_files = sorted([f for f in os.listdir(IMAGE_DIR) if f.endswith(('.png', '.jpg'))])
    mask_files = sorted(os.listdir(MASK_DIR))
    
    # Create a dictionary for quick mask lookup based on the sample ID (e.g., '0001')
    masks_dict = {Path(m).name.split('_')[0]: m for m in mask_files}
    # Map sample id to image filename
    images_dict = {Path(im).name.split('_')[0]: im for im in image_files}

    # Select images according to mode
    if selection_mode == "every10":
        # Old behavior: every 10th image, up to IMAGE_LIMIT
        images_to_process = image_files[::10][:IMAGE_LIMIT]
        print(f"Found {len(image_files)} total images. Processing up to {IMAGE_LIMIT} by selecting every 10th.")
    else:
        # Range mode: process serials from start..end (inclusive)
        serials = [f"{i:04d}" for i in range(start_serial, end_serial + 1)]
        missing = []
        images_to_process = []
        for s in serials:
            im = images_dict.get(s)
            if im:
                images_to_process.append(im)
            else:
                missing.append(s)
        print(f"Requested serials: {len(serials)}. Found images: {len(images_to_process)}. Missing: {len(missing)}")
        if missing:
            print(f"Missing serials (no image file): {' '.join(missing[:20])}{' ...' if len(missing)>20 else ''}")
    
    if not images_to_process:
        print("⚠️ No images found in the directory. Exiting.")
        return

    for image_filename in tqdm(images_to_process, desc="Inpainting Progress"):
        sample_id = image_filename.split('_')[0]

        if sample_id in masks_dict:
            mask_filename = masks_dict[sample_id]
            image_path = os.path.join(IMAGE_DIR, image_filename)
            mask_path = os.path.join(MASK_DIR, mask_filename)

            image_data, headers = call_clipdrop_api(image_path, mask_path)

            if image_data:
                p = Path(image_filename)
                output_filename = f"{p.stem}_inpainted{p.suffix}"
                output_path = os.path.join(output_dir, output_filename)
                
                with open(output_path, 'wb') as f:
                    f.write(image_data)
        else:
            tqdm.write(f"⚠️ Warning: No matching mask found for image {image_filename}")
    
    print("\n🎉 Inpainting process complete!")
    print(f"Results saved in: {output_dir}")

if __name__ == "__main__":
    main()