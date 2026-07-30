import os
import shutil
import random
import numpy as np
from PIL import Image, ImageDraw
import cv2
from pathlib import Path
import json
from tqdm import tqdm
import torch

# --- Cleanup and Setup ---
if os.path.exists("sample_dataset"):
    shutil.rmtree("sample_dataset")
    print("🧹 Cleaned up previous 'sample_dataset' directory.")

# --- Configuration ---
random.seed(42)
np.random.seed(42)
torch.manual_seed(42)

IMAGE_WIDTH = 512
IMAGE_HEIGHT = 512
OBJECT_SCALE_RANGE = (0.1, 0.4)
OBJECT_SIZE_JITTER = (0.7, 1.3)
MIN_FINAL_PIXEL_DIMENSION = 200
MAX_FINAL_PIXEL_DIMENSION = 400
MAX_TRANSFORM_RETRIES = 25
MASK_DILATION_FACTOR = 1.05

# --- NEW: Configuration for multi-object generation ---
NUM_MULTI_OBJECT_SAMPLES = 25 # Number of multi-object images to generate
MULTI_OBJECT_MIN_DIM = 100     # Min pixel size for objects in multi-object images
MULTI_OBJECT_MAX_DIM = 250    # Max pixel size for objects in multi-object images (smaller to fit more)

BACKGROUND_DIR = "sample_generator/backgrounds"
OBJECT_DIR = "sample_generator/objects"
OUTPUT_DIR = "sample_dataset"

print("\n✅ All libraries imported successfully!")
print(f" OpenCV version: {cv2.__version__}")
print(f" PyTorch version: {torch.__version__}")
print(f" PIL version: {Image.__version__}")

def load_images_from_directory(directory, extensions=('.jpg', '.jpeg', '.png', '.bmp')):
    """Load all image files from a directory"""
    image_paths = []
    if not os.path.exists(directory):
        print(f"⚠️ Directory not found: {directory}")
        return image_paths
    for file in os.listdir(directory):
        if file.lower().endswith(extensions):
            image_paths.append(os.path.join(directory, file))
    print(f"Found {len(image_paths)} images in {directory}")
    return image_paths

os.makedirs(BACKGROUND_DIR, exist_ok=True)
os.makedirs(OBJECT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

background_paths = load_images_from_directory(BACKGROUND_DIR)
object_paths = load_images_from_directory(OBJECT_DIR)

print(f"\n📁 Dataset Configuration:")
print(f" Image Dimensions: {IMAGE_WIDTH}x{IMAGE_HEIGHT}")
print(f" Background images: {len(background_paths)}")
print(f" Object cutouts: {len(object_paths)}")
print(f" Object Scale Range: {OBJECT_SCALE_RANGE}")
print(f" Object Size Jitter: {OBJECT_SIZE_JITTER}")
print(f" Single-Object Pixel Size Range: [{MIN_FINAL_PIXEL_DIMENSION}, {MAX_FINAL_PIXEL_DIMENSION}]")
print(f" Multi-Object Pixel Size Range: [{MULTI_OBJECT_MIN_DIM}, {MULTI_OBJECT_MAX_DIM}]")
print(f" Mask Dilation Factor: {MASK_DILATION_FACTOR}")
print(f" Output directory: {OUTPUT_DIR}")

if len(background_paths) == 0:
    print("\n🎨 Creating sample background images...")
    for i in range(3):
        img = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), color='white')
        draw = ImageDraw.Draw(img)
        for y in range(IMAGE_HEIGHT):
            color_val = int(255 * (y / IMAGE_HEIGHT))
            if i == 0: color = (color_val, 200, 255)
            elif i == 1: color = (200, color_val, 200)
            else: color = (255, 200, 255 - color_val)
            draw.line([(0, y), (IMAGE_WIDTH, y)], fill=color)
        bg_path = os.path.join(BACKGROUND_DIR, f'gradient_bg_{i+1}.jpg')
        img.save(bg_path)
        background_paths.append(bg_path)
    print(f" Created {len(background_paths)} sample backgrounds")

if len(object_paths) == 0:
    print("\n🔷 Creating sample object cutouts...")
    shapes = ['circle', 'square', 'triangle']
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
    for i, (shape, color) in enumerate(zip(shapes, colors)):
        img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        if shape == 'circle': draw.ellipse([20, 20, 108, 108], fill=color + (255,))
        elif shape == 'square': draw.rectangle([20, 20, 108, 108], fill=color + (255,))
        elif shape == 'triangle': draw.polygon([(64, 20), (20, 108), (108, 108)], fill=color + (255,))
        obj_path = os.path.join(OBJECT_DIR, f'{shape}_{i+1}.png')
        img.save(obj_path)
        object_paths.append(obj_path)
    print(f" Created {len(object_paths)} sample objects")

print(f"\n✅ Ready to generate dataset!")

def transform_object(object_img, target_size=(512, 512), scale_range=(0.1, 0.4), rotation_range=(-30, 30), size_jitter_range=(1.0, 1.0)):
    """Apply random transformations to an object cutout, including size jitter."""
    scale_factor = random.uniform(*scale_range)
    rotation_angle = random.uniform(*rotation_range)
    max_obj_size = int(min(target_size) * scale_factor)
    obj_aspect = object_img.width / object_img.height
    if obj_aspect > 1: obj_width, obj_height = max_obj_size, int(max_obj_size / obj_aspect)
    else: obj_height, obj_width = max_obj_size, int(max_obj_size * obj_aspect)
    resized_obj = object_img.resize((obj_width, obj_height), Image.Resampling.LANCZOS)
    jitter_factor = random.uniform(*size_jitter_range)
    jittered_width, jittered_height = int(resized_obj.width * jitter_factor), int(resized_obj.height * jitter_factor)
    jittered_obj = resized_obj.resize((jittered_width, jittered_height), Image.Resampling.LANCZOS) if jittered_width > 0 and jittered_height > 0 else resized_obj
    rotated_obj = jittered_obj.rotate(rotation_angle, expand=True) if abs(rotation_angle) > 1 else jittered_obj
    margin = 20
    max_x, max_y = target_size[0] - rotated_obj.width - margin, target_size[1] - rotated_obj.height - margin
    pos_x, pos_y = (random.randint(margin, max_x) if max_x > margin else margin), (random.randint(margin, max_y) if max_y > margin else margin)
    transform_params = {'scale_factor': scale_factor, 'jitter_factor': jitter_factor, 'rotation_angle': rotation_angle, 'position': (pos_x, pos_y), 'final_size': rotated_obj.size}
    return rotated_obj, transform_params

def dilate_mask(mask_img, object_size, dilation_factor):
    """Dilates a PIL mask using a rectangular kernel for sharper corners."""
    if dilation_factor <= 1.0: return mask_img
    mask_array, (obj_w, obj_h) = np.array(mask_img), object_size
    padding_w, padding_h = int(obj_w * (dilation_factor - 1.0) / 2), int(obj_h * (dilation_factor - 1.0) / 2)
    kernel_w, kernel_h = max(1, 2 * padding_w + 1), max(1, 2 * padding_h + 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, kernel_h))
    dilated_mask_array = cv2.dilate(mask_array, kernel, iterations=1)
    return Image.fromarray(dilated_mask_array)

def alpha_blend(object_img, background_img, mask):
    obj_array, bg_array = np.array(object_img, dtype=np.float32), np.array(background_img, dtype=np.float32)
    mask_3d = np.stack([np.array(mask, dtype=np.float32) / 255.0] * 3, axis=2)
    result = bg_array * (1 - mask_3d) + obj_array * mask_3d
    return Image.fromarray(result.astype(np.uint8))

def poisson_blend(object_img, background_img, mask, position, obj_size):
    obj_cv = cv2.cvtColor(np.array(object_img), cv2.COLOR_RGB2BGR)
    bg_cv = cv2.cvtColor(np.array(background_img), cv2.COLOR_RGB2BGR)
    mask_cv = np.array(mask)
    center_x = position[0] + obj_size[0] // 2
    center_y = position[1] + obj_size[1] // 2
    center = (max(1, min(background_img.width - 1, center_x)), max(1, min(background_img.height - 1, center_y)))
    result = cv2.seamlessClone(obj_cv, bg_cv, mask_cv, center, cv2.NORMAL_CLONE)
    return Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))

def apply_color_matching(object_img, background_img, mask):
    obj_array, bg_array = np.array(object_img), np.array(background_img)
    mask_array = np.array(mask) / 255.0
    if np.sum(mask_array) > 100:
        bg_mean = np.average(bg_array.reshape(-1, 3), weights=mask_array.flatten(), axis=0)
        obj_mean = np.average(obj_array.reshape(-1, 3), weights=mask_array.flatten(), axis=0)
        color_diff = bg_mean - obj_mean
        obj_array = np.clip(obj_array.astype(np.float32) + color_diff * 0.3, 0, 255).astype(np.uint8)
    return Image.fromarray(obj_array)

def composite_object_on_background(background_img, object_img, position, use_poisson=True, color_match=True):
    """Composite an object onto a background and return the composite and a DILATED mask."""
    background, target_size = background_img.convert('RGB'), background_img.size
    alpha = object_img.split()[-1]
    precise_mask = Image.new('L', target_size, 0)
    precise_mask.paste(alpha, position)
    dilated_mask = dilate_mask(precise_mask, object_img.size, MASK_DILATION_FACTOR)
    obj_rgb = Image.new('RGB', target_size, (0, 0, 0))
    obj_rgb.paste(object_img.convert('RGB'), position)
    if color_match: obj_rgb = apply_color_matching(obj_rgb, background, precise_mask)
    if use_poisson:
        try: composite = poisson_blend(obj_rgb, background, precise_mask, position, object_img.size)
        except Exception as e:
            print(f"Poisson blend failed, using alpha blend: {e}")
            composite = alpha_blend(obj_rgb, background, precise_mask)
    else: composite = alpha_blend(obj_rgb, background, precise_mask)
    return composite, dilated_mask

def setup_dataset_structure(output_dir):
    print(f"🗂️ Setting up dataset structure in: {output_dir}")
    subdirs = ['original_image', 'added_object', 'image_with_object', 'masked_image']
    for subdir in subdirs: os.makedirs(os.path.join(output_dir, subdir), exist_ok=True)
    print(f"✅ Dataset structure created successfully!")

# --- MODIFIED: Handles saving for one or more objects ---
def save_sample_quartet(gt_img, obj_imgs, input_img, mask_img, sample_id, bg_path, obj_paths, output_dir, quality=95):
    sample_num_str, bg_name = f"{sample_id:04d}", Path(bg_path).stem
    obj_names = "_".join([Path(p).stem for p in obj_paths])
    paths = {
        'original': os.path.join(output_dir, 'original_image', f"{sample_num_str}_{bg_name}.jpg"),
        'composite': os.path.join(output_dir, 'image_with_object', f"{sample_num_str}_{bg_name}_{obj_names}.jpg"),
        'mask': os.path.join(output_dir, 'masked_image', f"{sample_num_str}_mask_{obj_names}.png")}
    for i, (obj_img, obj_path) in enumerate(zip(obj_imgs, obj_paths)):
        obj_img.save(os.path.join(output_dir, 'added_object', f"{sample_num_str}_{Path(obj_path).stem}_{i+1}.png"), 'PNG')
    gt_img.save(paths['original'], 'JPEG', quality=quality)
    input_img.save(paths['composite'], 'JPEG', quality=quality)
    mask_img.save(paths['mask'], 'PNG')

# --- NEW: Metadata function for combined dataset ---
def save_combined_metadata(output_dir, single_samples, multi_samples, image_size):
    total_samples = single_samples + multi_samples
    metadata = {
        'dataset_name': 'Synthetic Inpainting Dataset (Combined)', 'creation_date': str(np.datetime64('now')),
        'total_samples': total_samples, 'image_size': image_size,
        'generation_summary': {'single_object_samples': single_samples, 'multi_object_samples': multi_samples},
        'directory_structure': {'original_image': 'Original background images.', 'added_object': 'Transformed object cutouts.', 'image_with_object': 'Composite images (inputs for inpainting).', 'masked_image': 'Masks identifying the object area.'}}
    path = os.path.join(output_dir, 'dataset_info.json')
    with open(path, 'w') as f: json.dump(metadata, f, indent=2)
    print(f"📄 Combined metadata for {total_samples} samples saved to: {path}")

# --- NEW: Helper function to check for object overlap ---
def check_overlap(box1, box2, spacing=15):
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    if (x1 < x2 + w2 + spacing) and (x1 + w1 + spacing > x2):
        if (y1 < y2 + h2 + spacing) and (y1 + h1 + spacing > y2): return True
    return False

class SyntheticDatasetGenerator:
    def __init__(self, background_paths, object_paths, output_dir, image_size=(512, 512)):
        self.background_paths, self.object_paths = background_paths, object_paths
        self.output_dir, self.image_size = output_dir, image_size
        setup_dataset_structure(self.output_dir)
        
    # --- NEW: Helper method to validate object size with retries ---
    def _validate_and_transform_object(self, object_img, min_dim, max_dim):
        for _ in range(MAX_TRANSFORM_RETRIES):
            transformed_obj, params = transform_object(
                object_img, target_size=self.image_size, 
                scale_range=OBJECT_SCALE_RANGE, size_jitter_range=OBJECT_SIZE_JITTER
            )
            final_w, final_h = params['final_size']
            if min_dim <= max(final_w, final_h) <= max_dim:
                return transformed_obj, params
        return None, None # Return None if no valid transform found after retries

    def process_one_combination(self, bg_path, obj_path, sample_id, use_poisson=True, color_match=True):
        try:
            background = Image.open(bg_path).convert('RGB').resize(self.image_size, Image.Resampling.LANCZOS)
            object_img = Image.open(obj_path).convert('RGBA')
            
            transformed_obj, params = self._validate_and_transform_object(
                object_img, MIN_FINAL_PIXEL_DIMENSION, MAX_FINAL_PIXEL_DIMENSION
            )
            if not transformed_obj:
                tqdm.write(f"⚠️ Skipping combo ({Path(bg_path).name}, {Path(obj_path).name}): Could not meet pixel constraints.")
                return False

            input_img, mask_img = composite_object_on_background(
                background, transformed_obj, params['position'], use_poisson=use_poisson, color_match=color_match
            )
            
            save_sample_quartet(
                gt_img=background, obj_imgs=[transformed_obj], input_img=input_img, mask_img=mask_img,
                sample_id=sample_id, bg_path=bg_path, obj_paths=[obj_path], output_dir=self.output_dir
            )
            return True
        except Exception as e:
            tqdm.write(f"❌ Error on {Path(bg_path).name} + {Path(obj_path).name}: {e}")
            return False

    def generate_single_object_dataset(self, use_poisson=True, color_match=True):
        if not self.background_paths or not self.object_paths: raise ValueError("No background or object images found!")
        all_combinations = [(bg, obj) for bg in self.background_paths for obj in self.object_paths]
        successful_samples = 0
        with tqdm(total=len(all_combinations), desc="Stage 1: Single-Object") as pbar:
            for i, (bg_path, obj_path) in enumerate(all_combinations):
                if self.process_one_combination(bg_path, obj_path, i + 1, use_poisson, color_match):
                    successful_samples += 1
                pbar.update(1)
        print(f" ✅ Stage 1 complete. Generated: {successful_samples}/{len(all_combinations)} samples.")
        return successful_samples

    # --- NEW: Method to process a multi-object combination ---
    def process_multi_object_combination(self, bg_path, obj_path1, obj_path2, sample_id, use_poisson=True, color_match=True):
        try:
            background = Image.open(bg_path).convert('RGB').resize(self.image_size, Image.Resampling.LANCZOS)
            obj_img1 = Image.open(obj_path1).convert('RGBA')
            obj_img2 = Image.open(obj_path2).convert('RGBA')

            transformed_obj1, params1 = self._validate_and_transform_object(obj_img1, MULTI_OBJECT_MIN_DIM, MULTI_OBJECT_MAX_DIM)
            if not transformed_obj1: return False
            box1 = (*params1['position'], *params1['final_size'])

            for _ in range(50): # Try to place the second object 50 times
                transformed_obj2, params2 = self._validate_and_transform_object(obj_img2, MULTI_OBJECT_MIN_DIM, MULTI_OBJECT_MAX_DIM)
                if transformed_obj2 and not check_overlap(box1, (*params2['position'], *params2['final_size'])):
                    # Composite first object
                    composite_img, mask1 = composite_object_on_background(background, transformed_obj1, params1['position'], use_poisson, color_match)
                    # Composite second object onto the result of the first
                    final_composite_img, mask2 = composite_object_on_background(composite_img, transformed_obj2, params2['position'], use_poisson, color_match)
                    
                    combined_mask = Image.fromarray(np.bitwise_or(np.array(mask1), np.array(mask2)))
                    save_sample_quartet(gt_img=background, obj_imgs=[transformed_obj1, transformed_obj2], 
                                        input_img=final_composite_img, mask_img=combined_mask, 
                                        sample_id=sample_id, bg_path=bg_path, 
                                        obj_paths=[obj_path1, obj_path2], output_dir=self.output_dir)
                    return True

            tqdm.write(f"⚠️ Skipping multi-object combo: Could not place {Path(obj_path2).name} without overlap.")
            return False
        except Exception as e:
            tqdm.write(f"❌ Error on multi-object {Path(bg_path).name}: {e}")
            return False

    # --- NEW: Method to generate the multi-object dataset ---
    def generate_multi_object_dataset(self, num_samples, start_id=1, use_poisson=True, color_match=True):
        if len(self.background_paths) == 0 or len(self.object_paths) < 2: 
            raise ValueError("Need at least 1 background and 2 objects for multi-object generation!")
        
        successful_samples = 0
        with tqdm(total=num_samples, desc="Stage 2: Multi-Object") as pbar:
            attempts = 0
            while successful_samples < num_samples and attempts < num_samples * 5: # Safety break
                bg_path = random.choice(self.background_paths)
                obj_path1, obj_path2 = random.sample(self.object_paths, 2)
                if self.process_multi_object_combination(bg_path, obj_path1, obj_path2, start_id + successful_samples, use_poisson, color_match):
                    successful_samples += 1
                    pbar.update(1)
                attempts += 1
                if pbar.n >= num_samples: break
        
        print(f" ✅ Stage 2 complete. Generated: {successful_samples}/{num_samples} samples.")
        return successful_samples

# --- Main Execution (MODIFIED to run both stages) ---
if __name__ == "__main__":
    if background_paths and object_paths:
        USE_POISSON_BLENDING = False
        USE_COLOR_MATCHING = True

        generator = SyntheticDatasetGenerator(
            background_paths=background_paths, object_paths=object_paths,
            output_dir=OUTPUT_DIR, image_size=(IMAGE_WIDTH, IMAGE_HEIGHT)
        )

        # --- STAGE 1: Generate all single-object combinations ---
        num_single = generator.generate_single_object_dataset(use_poisson=USE_POISSON_BLENDING, color_match=USE_COLOR_MATCHING)
        
        # --- STAGE 2: Generate multi-object add-ons ---
        num_multi = generator.generate_multi_object_dataset(num_samples=NUM_MULTI_OBJECT_SAMPLES, start_id=num_single + 1, use_poisson=USE_POISSON_BLENDING, color_match=USE_COLOR_MATCHING)
        
        # --- STAGE 3: Finalize and save combined metadata ---
        print("\n✨ Finalizing dataset...")
        save_combined_metadata(output_dir=OUTPUT_DIR, single_samples=num_single, multi_samples=num_multi, image_size=(IMAGE_WIDTH, IMAGE_HEIGHT))

        print(f"\n🎊 Combined dataset generation complete! Total samples: {num_single + num_multi}")
        print(f" Dataset saved to: {OUTPUT_DIR}")
    else:
        print("\n⚠️ Cannot generate dataset - need background and object images.")
        print(" Add images to the 'sample_generator/backgrounds' and 'sample_generator/objects' directories.")