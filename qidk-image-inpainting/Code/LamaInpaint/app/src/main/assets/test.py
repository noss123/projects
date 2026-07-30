import tensorflow as tf
import sys
import numpy as np

def check_model_precision(model_path):
    """
    Loads a TFLite model and inspects the data types of its internal tensors.
    """
    if not model_path.endswith('.tflite'):
        print(f"Error: Not a .tflite file: {model_path}")
        return

    print(f"--- Analyzing Model: {model_path} ---")

    try:
        # Load the TFLite model
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()

        # Get details about all tensors in the model (inputs, outputs, and internal)
        tensor_details = interpreter.get_tensor_details()

        print(f"Found {len(tensor_details)} total tensors.")

        # --- Check Input/Output Types ---
        print("\n--- Input Tensors ---")
        for i in interpreter.get_input_details():
            print(f"  - Name: {i['name']}, Type: {i['dtype']}")

        print("\n--- Output Tensors ---")
        for o in interpreter.get_output_details():
            print(f"  - Name: {o['name']}, Type: {o['dtype']}")

        # --- Check Internal Weight/Activation Types ---
        print("\n--- Internal Tensor Types (Sample) ---")
        type_counts = {}
        fp16_tensors = []

        for tensor in tensor_details:
            # Get the data type name
            dtype_name = tensor['dtype'].__name__
            
            # Count occurrences of each type
            type_counts[dtype_name] = type_counts.get(dtype_name, 0) + 1

            # Store the name if it's float16
            if tensor['dtype'] == np.float16:
                fp16_tensors.append(tensor['name'])

        print(f"\nSummary of all tensor types found:")
        for dtype_name, count in type_counts.items():
            print(f"  - {dtype_name}: {count} tensors")
        
        # --- Final Conclusion ---
        if 'float16' in type_counts:
            print("\n✅ Conclusion: This model CONTAINS FP16 tensors.")
            print("This indicates it was successfully compiled or quantized to FP16.")
            # print("\nSample of FP16 tensors found:")
            # for name in fp16_tensors[:5]: # Print first 5
            #    print(f"  - {name}")
        else:
            print("\n❌ Conclusion: This model does NOT contain any FP16 tensors.")
            print("It appears to be a pure FP32 or integer-quantized model.")

    except Exception as e:
        print(f"\nAn error occurred while loading or inspecting the model: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_fp16.py <path_to_your_model.tflite>")
        sys.exit(1)
    
    check_model_precision(sys.argv[1])