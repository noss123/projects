import argparse
import cv2
import torch
import lpips
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim

def load_and_preprocess_image(image_path):
    """
    Loads an image and preprocesses it for both scikit-image (numpy) and LPIPS (torch).
    
    Returns:
        tuple: A tuple containing (numpy_image, torch_tensor).
    """
    # Load image for scikit-image (H, W, C) in BGR format
    numpy_image = cv2.imread(image_path)
    if numpy_image is None:
        raise FileNotFoundError(f"Image not found at {image_path}")

    # --- Preprocess for LPIPS ---
    # 1. Convert BGR to RGB
    rgb_image = cv2.cvtColor(numpy_image, cv2.COLOR_BGR2RGB)
    
    # 2. Normalize to [0, 1] range and convert to float32
    normalized_image = rgb_image.astype(np.float32) / 255.0
    
    # 3. Convert to a PyTorch tensor and rearrange from (H, W, C) to (C, H, W)
    tensor_image = torch.from_numpy(normalized_image).permute(2, 0, 1)
    
    # 4. Add a batch dimension (B, C, H, W)
    tensor_image = tensor_image.unsqueeze(0)

    return numpy_image, tensor_image

def main():
    parser = argparse.ArgumentParser(description="Calculate full and masked IQA metrics between three images.")
    parser.add_argument("reference_image", help="Path to the reference (ground truth) image file.")
    parser.add_argument("inpainted_image", help="Path to the inpainted (model output) image file.")
    # --- NEW: Add argument for the mask image ---
    parser.add_argument("mask_image", help="Path to the mask image file (white on black).")
    args = parser.parse_args()

    try:
        # Load and preprocess images
        ref_np, ref_tensor = load_and_preprocess_image(args.reference_image)
        inp_np, inp_tensor = load_and_preprocess_image(args.inpainted_image)
        
        # --- NEW: Load the mask image as grayscale ---
        mask_np = cv2.imread(args.mask_image, cv2.IMREAD_GRAYSCALE)
        if mask_np is None:
            raise FileNotFoundError(f"Mask image not found at {args.mask_image}")

    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # Ensure images are the same size
    if not (ref_np.shape[:2] == inp_np.shape[:2] == mask_np.shape[:2]):
        print("Error: All images (reference, inpainted, and mask) must have the same height and width.")
        return

    # --- 1. Full Image Metrics (as before) ---
    print("\n--- Full Image Metrics ---")
    full_psnr = psnr(ref_np, inp_np, data_range=255)
    full_ssim = ssim(ref_np, inp_np, multichannel=True, channel_axis=2, data_range=255)
    
    lpips_model = lpips.LPIPS(net='alex')
    with torch.no_grad():
        lpips_value = lpips_model(ref_tensor, inp_tensor)

    print(f"PSNR: {full_psnr:.2f} dB")
    print(f"SSIM: {full_ssim:.4f}")
    print(f"LPIPS: {lpips_value.item():.4f}")
    print("--------------------------")

    # --- 2. Masked Region Metrics ---
    print("\n--- Masked Region Metrics ---")
    
    # Create a boolean mask (True for white pixels, False for black)
    bool_mask = mask_np > 128 # Use a threshold to handle any gray pixels

    # For PSNR, we can use the boolean mask to select only the relevant pixels
    # This creates a 1D array of pixels from the masked region
    ref_masked_pixels = ref_np[bool_mask]
    inp_masked_pixels = inp_np[bool_mask]
    
    masked_psnr = psnr(ref_masked_pixels, inp_masked_pixels, data_range=255)
    print(f"Masked PSNR: {masked_psnr:.2f} dB")

    # For SSIM, we need a 2D patch. We'll use the bounding box of the mask.
    # Find the coordinates of all white pixels
    coords = np.argwhere(bool_mask)
    if coords.size > 0:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        
        # Crop the images to the bounding box
        ref_cropped = ref_np[y0:y1+1, x0:x1+1]
        inp_cropped = inp_np[y0:y1+1, x0:x1+1]
        
        # Calculate SSIM on the cropped (bounding box) region
        masked_ssim = ssim(ref_cropped, inp_cropped, multichannel=True, channel_axis=2, data_range=255)
        print(f"Masked SSIM (BBox): {masked_ssim:.4f}")
    else:
        print("Masked SSIM (BBox): Not calculated (mask is empty).")
        
    print("---------------------------\n")

if __name__ == "__main__":
    main()
