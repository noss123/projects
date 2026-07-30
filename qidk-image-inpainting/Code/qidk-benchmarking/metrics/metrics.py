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
    parser = argparse.ArgumentParser(description="Calculate PSNR, SSIM, and LPIPS between two images.")
    parser.add_argument("reference_image", help="Path to the reference (ground truth) image file.")
    parser.add_argument("inpainted_image", help="Path to the inpainted (model output) image file.")
    args = parser.parse_args()

    print(f"Loading images...")
    print(f"  Reference: {args.reference_image}")
    print(f"  Inpainted: {args.inpainted_image}")
    
    try:
        # Load and preprocess images
        ref_np, ref_tensor = load_and_preprocess_image(args.reference_image)
        inp_np, inp_tensor = load_and_preprocess_image(args.inpainted_image)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # Ensure images are the same size
    if ref_np.shape != inp_np.shape:
        print("Error: Images must have the same dimensions.")
        return

    print("\nCalculating metrics...")

    # --- 1. Calculate PSNR ---
    # A higher PSNR generally indicates better reconstruction quality.
    psnr_value = psnr(ref_np, inp_np, data_range=255)

    # --- 2. Calculate SSIM ---
    # SSIM values are between -1 and 1, where 1 indicates a perfect match.
    ssim_value = ssim(ref_np, inp_np, multichannel=True, channel_axis=2, data_range=255)

    # --- 3. Calculate LPIPS ---
    # Lower LPIPS scores indicate the two images are more perceptually similar.
    # Initialize the LPIPS model (uses AlexNet by default).
    lpips_model = lpips.LPIPS(net='alex')
    
    # LPIPS library expects tensor values in [0, 1] range.
    # The helper function already prepares the tensor in the correct format.
    with torch.no_grad(): # No need to compute gradients
        lpips_value = lpips_model(ref_tensor, inp_tensor)

    # Print the results
    print("\n--- Image Quality Metrics ---")
    print(f"PSNR: {psnr_value:.2f} dB (Higher is better)")
    print(f"SSIM: {ssim_value:.4f} (Closer to 1 is better)")
    print(f"LPIPS: {lpips_value.item():.4f} (Lower is better)")
    print("-----------------------------\n")

if __name__ == "__main__":
    main()
