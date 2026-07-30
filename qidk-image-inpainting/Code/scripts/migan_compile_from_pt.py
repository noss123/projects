#!/usr/bin/env python3
"""
Export just the core MI-GAN Generator model (without dynamic pipeline).
This produces a static ONNX model that can be compiled for QNN/HTP.

The Generator model takes:
- Input: (1, 4, H, W) where channels are [mask - 0.5, image * mask]
  - Channel 0: mask - 0.5 (mask values normalized to -0.5 to 0.5)
  - Channels 1-3: image * mask (masked RGB image, normalized to -1 to 1)
- Output: (1, 3, H, W) inpainted image (normalized to -1 to 1)

Usage:
    python export_generator_only.py --model-path ../models/migan_places512.pt \
                                    --resolution 512 \
                                    --output migan_generator_512.onnx
"""

import argparse
import torch
import torch.nn as nn
import numpy as np
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.model_zoo.migan_inference import Generator as MIGAN


def export_generator(model_path: str, resolution: int, output_path: str, opset_version: int = 17):
    """
    Export the core MI-GAN Generator to ONNX.
    
    Args:
        model_path: Path to the .pt weights file
        resolution: Model resolution (256 or 512)
        output_path: Output ONNX file path
        opset_version: ONNX opset version
    """
    print(f"Loading MI-GAN Generator with resolution {resolution}...")
    
    # Create generator
    generator = MIGAN(resolution=resolution)
    
    # Load weights
    state_dict = torch.load(model_path, map_location='cpu')
    generator.load_state_dict(state_dict)
    generator.eval()
    
    print(f"Model loaded successfully. Parameters: {sum(p.numel() for p in generator.parameters()):,}")
    
    # Create dummy input - Generator expects 4 channels: mask(-0.5) + masked_image(3ch)
    # Shape: (batch, 4, resolution, resolution)
    dummy_input = torch.randn(1, 4, resolution, resolution, dtype=torch.float32)
    
    print(f"Exporting to ONNX with opset {opset_version}...")
    
    # Export to ONNX
    torch.onnx.export(
        generator,
        dummy_input,
        output_path,
        verbose=False,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes=None  # Static shape - no dynamic axes for QNN compatibility
    )
    
    print(f"✅ Exported to {output_path}")
    
    # Verify the export
    import onnx
    model = onnx.load(output_path)
    onnx.checker.check_model(model)
    print(f"✅ ONNX model verified successfully")
    
    # Check for problematic ops
    problematic_ops = ['Range', 'NonZero', 'Shape', 'Gather', 'Squeeze']
    found_ops = {}
    for node in model.graph.node:
        if node.op_type in problematic_ops:
            found_ops[node.op_type] = found_ops.get(node.op_type, 0) + 1
    
    if found_ops:
        print(f"⚠️  Warning: Found potentially dynamic ops: {found_ops}")
    else:
        print(f"✅ No dynamic ops found - ready for QNN compilation!")
    
    return output_path


def get_args():
    parser = argparse.ArgumentParser(description="Export MI-GAN Generator to ONNX")
    parser.add_argument("--model-path", type=str, required=True, 
                       help="Path to the .pt model weights")
    parser.add_argument("--resolution", type=int, default=512,
                       help="Model resolution (256 or 512)")
    parser.add_argument("--output", type=str, default=None,
                       help="Output ONNX file path")
    parser.add_argument("--opset", type=int, default=17,
                       help="ONNX opset version")
    return parser.parse_args()


if __name__ == '__main__':
    args = get_args()
    
    if args.output is None:
        args.output = f"migan_generator_{args.resolution}.onnx"
    
    export_generator(
        model_path=args.model_path,
        resolution=args.resolution,
        output_path=args.output,
        opset_version=args.opset
    )
