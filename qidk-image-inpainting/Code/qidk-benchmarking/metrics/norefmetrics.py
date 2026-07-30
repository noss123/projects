import argparse
import torch
import pyiqa
from PIL import Image
import torchvision.transforms as transforms
import warnings

# Suppress a specific warning from the pyiqa library if it appears
warnings.filterwarnings("ignore", message="The given input is not a torch tensor, transforming it to one.")

# Check if CUDA (for GPU) is available, otherwise use CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_image_as_tensor(image_path):
    """Load an image and convert it to a PyTorch tensor."""
    try:
        img = Image.open(image_path).convert("RGB")
    except FileNotFoundError:
        raise FileNotFoundError(f"Image not found: {image_path}")
        
    # Define a transformation to convert image to tensor
    # The pyiqa models expect a tensor in the range [0, 1]
    transform = transforms.Compose([
        transforms.ToTensor()
    ])
    
    # Apply the transform and add a batch dimension (B, C, H, W)
    img_tensor = transform(img).unsqueeze(0).to(device)
    return img_tensor


def compute_no_reference_metrics(img_tensor):
    """
    Compute NIQE, BRISQUE, and PIQE scores using the pyiqa library.
    Lower scores are better for all three metrics.
    """
    # Create metric objects for each IQA model
    # The models will be downloaded automatically on first use
    niqe_metric = pyiqa.create_metric('niqe', device=device)
    brisque_metric = pyiqa.create_metric('brisque', device=device)
    piqe_metric = pyiqa.create_metric('piqe', device=device)

    # --- NIQE ---
    try:
        # pyiqa's NIQE expects a grayscale image
        img_tensor_gray = transforms.Grayscale()(img_tensor)
        niqe_score = niqe_metric(img_tensor_gray).item()
    except Exception as e:
        niqe_score = None
        print(f"NIQE failed: {e}")

    # --- BRISQUE ---
    try:
        brisque_score = brisque_metric(img_tensor).item()
    except Exception as e:
        brisque_score = None
        print(f"BRISQUE failed: {e}")

    # --- PIQE ---
    try:
        piqe_score = piqe_metric(img_tensor).item()
    except Exception as e:
        piqe_score = None
        print(f"PIQE failed: {e}")
        
    return niqe_score, brisque_score, piqe_score


def main():
    parser = argparse.ArgumentParser(description="Compute no-reference IQA metrics using pyiqa")
    parser.add_argument("inpainted_image", help="Path to the image to be evaluated")
    args = parser.parse_args()

    print(f"Using device: {device}")
    print(f"Loading {args.inpainted_image}...")
    img_tensor = load_image_as_tensor(args.inpainted_image)

    print("\nCalculating no-reference metrics...")
    niqe_score, brisque_score, piqe_score = compute_no_reference_metrics(img_tensor)

    print("\n--- No-reference Image Quality Metrics ---")
    if niqe_score is not None:
        print(f"NIQE   : {niqe_score:.4f} (Lower = more natural)")
    if brisque_score is not None:
        print(f"BRISQUE: {brisque_score:.4f} (Lower = better quality)")
    if piqe_score is not None:
        print(f"PIQE   : {piqe_score:.4f} (Lower = fewer distortions)")
    print("------------------------------------------\n")

if __name__ == "__main__":
    main()
