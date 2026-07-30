// ---------------------------------------------------------------------
// Copyright (c) 2025 Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause
// ---------------------------------------------------------------------
package com.qidk.lamainpaint;

import android.content.Context;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.util.Log;
import android.util.Pair;

import com.qidk.lamainpaint.tflite.AIHubDefaults;
import com.qidk.lamainpaint.tflite.TFLiteHelpers;

import org.tensorflow.lite.DataType;
import org.tensorflow.lite.Delegate;
import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.Tensor;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.MappedByteBuffer;
import java.util.Map;
import java.util.Set;

/**
 * MI-GAN Inpainting Engine
 * 
 * MI-GAN Generator expects a single 4-channel input:
 * - Input shape: (1, 512, 512, 4) HWC format for TFLite
 * - Channel 0: mask - 0.5 (mask normalized to [-0.5, 0.5])
 * - Channels 1-3: image * mask (masked RGB image, normalized to [-1, 1])
 * 
 * Output: (1, 512, 512, 3) in range [-1, 1]
 * 
 * MI-GAN mask convention:
 * - mask=1 (white) = KNOWN region (keep original)
 * - mask=0 (black) = HOLE (to inpaint)
 * 
 * App mask convention:
 * - White = background (keep)
 * - Black = drawn mask (hole to inpaint)
 * 
 * These are the SAME convention, so no inversion needed.
 */
public class MiganInpainting {
    private static final String TAG = "MiganInpainting";
    private static final int MODEL_SIZE = 512;

    private final Interpreter interpreter;
    private final Map<TFLiteHelpers.DelegateType, Delegate> delegates;
    private final int modelInputHeight;
    private final int modelInputWidth;
    private final int numInputChannels;
    private final boolean isHWCFormat;  // true for HWC (TFLite), false for CHW
    private final DataType inputDataType;
    private final DataType outputDataType;

    /**
     * Create a MiganInpainting inference engine.
     *
     * @param context          Android application context
     * @param modelFilename    Filename of the TFLite model in assets
     * @param enabledDelegates Set of delegates to enable (NPU, GPU, or empty for CPU-only)
     * @throws Exception if model loading fails
     */
    public MiganInpainting(Context context, String modelFilename, Set<TFLiteHelpers.DelegateType> enabledDelegates) throws Exception {
        AssetManager assets = context.getAssets();

        // Load the model
        Pair<MappedByteBuffer, String> modelData;
        try {
            modelData = TFLiteHelpers.loadModelFile(assets, modelFilename);
        } catch (Exception e) {
            Log.e(TAG, "Failed to load model: " + e.getMessage());
            throw new RuntimeException("Failed to load TFLite model: " + modelFilename, e);
        }

        MappedByteBuffer tfLiteModel = modelData.first;
        String modelIdentifier = modelData.second;

        // Determine delegate priority order based on enabled delegates
        TFLiteHelpers.DelegateType[][] delegatePriorityOrder;
        if (enabledDelegates.isEmpty()) {
            Log.i(TAG, "CPU-only mode requested");
            delegatePriorityOrder = new TFLiteHelpers.DelegateType[][] { {} };
        } else {
            Log.i(TAG, "Enabled delegates: " + enabledDelegates.toString());
            delegatePriorityOrder = AIHubDefaults.delegatePriorityOrderForDelegates(enabledDelegates);
        }

        // Create interpreter with delegates
        Pair<Interpreter, Map<TFLiteHelpers.DelegateType, Delegate>> interpreterPair =
                TFLiteHelpers.CreateInterpreterAndDelegatesFromOptions(
                        tfLiteModel,
                        delegatePriorityOrder,
                        AIHubDefaults.numCPUThreads,
                        context.getApplicationInfo().nativeLibraryDir,
                        context.getCacheDir().getAbsolutePath(),
                        modelIdentifier
                );

        this.interpreter = interpreterPair.first;
        this.delegates = interpreterPair.second;

        // Get model input/output information
        Tensor inputTensor = interpreter.getInputTensor(0);
        Tensor outputTensor = interpreter.getOutputTensor(0);

        int[] inputShape = inputTensor.shape();
        this.inputDataType = inputTensor.dataType();
        this.outputDataType = outputTensor.dataType();

        // MI-GAN input format detection
        // CHW format: [1, 4, H, W] - channels first
        // HWC format: [1, H, W, 4] - channels last (typical for TFLite)
        if (inputShape.length != 4) {
            throw new RuntimeException("Expected 4D input tensor, got: " + inputShape.length);
        }

        if (inputShape[1] == 4) {
            // CHW format: [1, 4, H, W]
            this.isHWCFormat = false;
            this.numInputChannels = inputShape[1];
            this.modelInputHeight = inputShape[2];
            this.modelInputWidth = inputShape[3];
        } else if (inputShape[3] == 4) {
            // HWC format: [1, H, W, 4]
            this.isHWCFormat = true;
            this.numInputChannels = inputShape[3];
            this.modelInputHeight = inputShape[1];
            this.modelInputWidth = inputShape[2];
        } else {
            throw new RuntimeException("Expected 4-channel input for MI-GAN, got shape: " + java.util.Arrays.toString(inputShape));
        }

        Log.i(TAG, "MI-GAN model loaded successfully");
        Log.i(TAG, "Input shape: " + java.util.Arrays.toString(inputShape));
        Log.i(TAG, "Format: " + (isHWCFormat ? "HWC (channels last)" : "CHW (channels first)"));
        Log.i(TAG, "Model size: " + modelInputWidth + "x" + modelInputHeight);
        Log.i(TAG, "Input channels: " + numInputChannels);
        Log.i(TAG, "Input data type: " + inputDataType);
        Log.i(TAG, "Output data type: " + outputDataType);
        Log.i(TAG, "Active delegates: " + delegates.keySet().toString());
    }

    /**
     * Perform inpainting on the given image and mask.
     *
     * @param inputBitmap Input image
     * @param maskBitmap  Mask image (white = keep, black = inpaint/remove) - APP CONVENTION (same as MI-GAN)
     * @return Pair of (result bitmap, inference time in ms)
     */
    public Pair<Bitmap, Long> inpaint(Bitmap inputBitmap, Bitmap maskBitmap) {
        long startTime = System.currentTimeMillis();

        // Resize inputs to model size
        Bitmap resizedInput = Bitmap.createScaledBitmap(inputBitmap, modelInputWidth, modelInputHeight, true);
        Bitmap resizedMask = Bitmap.createScaledBitmap(maskBitmap, modelInputWidth, modelInputHeight, true);

        // Prepare combined 4-channel input for MI-GAN
        ByteBuffer combinedTensor = prepareMiganInput(resizedInput, resizedMask);

        long preprocessTime = System.currentTimeMillis() - startTime;

        // Run inference
        long inferenceStart = System.currentTimeMillis();
        ByteBuffer outputTensor = runInference(combinedTensor);
        long inferenceTime = System.currentTimeMillis() - inferenceStart;

        // Postprocess: convert output tensor to bitmap
        Bitmap modelOutput = tensorToBitmap(outputTensor, modelInputWidth, modelInputHeight);
        
        // Blend model output with original image using the mask
        // MI-GAN output is the full generated image, but we only use the hole regions
        Bitmap resultBitmap = blendWithOriginal(resizedInput, modelOutput, resizedMask);

        long totalTime = System.currentTimeMillis() - startTime;

        Log.i(TAG, "Preprocessing time: " + preprocessTime + " ms");
        Log.i(TAG, "Inference time: " + inferenceTime + " ms");
        Log.i(TAG, "Total time: " + totalTime + " ms");

        return new Pair<>(resultBitmap, inferenceTime);
    }
    
    /**
     * Blend model output with original image using the mask.
     * 
     * Following migan_inference.py postprocessing:
     * - Use original where mask=1 (white, known region)
     * - Use model output where mask=0 (black, hole/inpainted region)
     * 
     * Formula: blended = original * mask + output * (1 - mask)
     */
    private Bitmap blendWithOriginal(Bitmap original, Bitmap modelOutput, Bitmap mask) {
        int width = original.getWidth();
        int height = original.getHeight();
        
        int[] originalPixels = new int[width * height];
        int[] outputPixels = new int[width * height];
        int[] maskPixels = new int[width * height];
        int[] resultPixels = new int[width * height];
        
        original.getPixels(originalPixels, 0, width, 0, 0, width, height);
        modelOutput.getPixels(outputPixels, 0, width, 0, 0, width, height);
        mask.getPixels(maskPixels, 0, width, 0, 0, width, height);
        
        for (int i = 0; i < width * height; i++) {
            int maskPixel = maskPixels[i];
            int maskR = (maskPixel >> 16) & 0xFF;
            int maskG = (maskPixel >> 8) & 0xFF;
            int maskB = maskPixel & 0xFF;
            float maskGray = (0.299f * maskR + 0.587f * maskG + 0.114f * maskB) / 255.0f;
            
            // maskGray close to 1 = white = keep original
            // maskGray close to 0 = black = use model output (inpainted)
            int origPixel = originalPixels[i];
            int outPixel = outputPixels[i];
            
            int origR = (origPixel >> 16) & 0xFF;
            int origG = (origPixel >> 8) & 0xFF;
            int origB = origPixel & 0xFF;
            
            int outR = (outPixel >> 16) & 0xFF;
            int outG = (outPixel >> 8) & 0xFF;
            int outB = outPixel & 0xFF;
            
            // Blend: original * mask + output * (1 - mask)
            int finalR = (int) (origR * maskGray + outR * (1 - maskGray));
            int finalG = (int) (origG * maskGray + outG * (1 - maskGray));
            int finalB = (int) (origB * maskGray + outB * (1 - maskGray));
            
            resultPixels[i] = (0xFF << 24) | (finalR << 16) | (finalG << 8) | finalB;
        }
        
        Bitmap result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        result.setPixels(resultPixels, 0, width, 0, 0, width, height);
        return result;
    }

    /**
     * Prepare the combined 4-channel input tensor for MI-GAN.
     * 
     * Following migan_inference.py preprocessing:
     * - Image: img * 2 / 255 - 1 → range [-1, 1]
     * - Mask: threshold to binary (white=1=keep, black=0=hole)
     * - Combined: [mask - 0.5, img * mask]
     * 
     * Supports both CHW and HWC formats based on model.
     */
    private ByteBuffer prepareMiganInput(Bitmap imageBitmap, Bitmap maskBitmap) {
        int width = imageBitmap.getWidth();
        int height = imageBitmap.getHeight();
        int totalSize = 4 * width * height; // 4 channels

        ByteBuffer buffer = ByteBuffer.allocateDirect(4 * totalSize);
        buffer.order(ByteOrder.nativeOrder());
        FloatBuffer floatBuffer = buffer.asFloatBuffer();

        // Get pixels
        int[] imagePixels = new int[width * height];
        int[] maskPixels = new int[width * height];
        imageBitmap.getPixels(imagePixels, 0, width, 0, 0, width, height);
        maskBitmap.getPixels(maskPixels, 0, width, 0, 0, width, height);

        float[] values = new float[4 * width * height];

        if (isHWCFormat) {
            // HWC format: [H, W, 4] - interleaved channels
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    int pixelIdx = y * width + x;
                    int imagePixel = imagePixels[pixelIdx];
                    int maskPixel = maskPixels[pixelIdx];

                    // Extract RGB from image and normalize to [-1, 1]
                    float r = ((imagePixel >> 16) & 0xFF) * 2.0f / 255.0f - 1.0f;
                    float g = ((imagePixel >> 8) & 0xFF) * 2.0f / 255.0f - 1.0f;
                    float b = (imagePixel & 0xFF) * 2.0f / 255.0f - 1.0f;

                    // Extract mask value (grayscale)
                    int maskR = (maskPixel >> 16) & 0xFF;
                    int maskG = (maskPixel >> 8) & 0xFF;
                    int maskB = maskPixel & 0xFF;
                    float maskGray = (0.299f * maskR + 0.587f * maskG + 0.114f * maskB);

                    // App: white=keep, black=hole → MI-GAN: 1=keep, 0=hole (SAME)
                    float maskBinary = maskGray >= 128f ? 1.0f : 0.0f;

                    // HWC: each pixel has 4 consecutive values
                    int baseIdx = pixelIdx * 4;
                    values[baseIdx] = maskBinary - 0.5f;        // Channel 0: mask - 0.5
                    values[baseIdx + 1] = r * maskBinary;       // Channel 1: R * mask
                    values[baseIdx + 2] = g * maskBinary;       // Channel 2: G * mask
                    values[baseIdx + 3] = b * maskBinary;       // Channel 3: B * mask
                }
            }
        } else {
            // CHW format: [4, H, W] - planar channels
            int channelSize = width * height;
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    int pixelIdx = y * width + x;
                    int imagePixel = imagePixels[pixelIdx];
                    int maskPixel = maskPixels[pixelIdx];

                    // Extract RGB from image and normalize to [-1, 1]
                    float r = ((imagePixel >> 16) & 0xFF) * 2.0f / 255.0f - 1.0f;
                    float g = ((imagePixel >> 8) & 0xFF) * 2.0f / 255.0f - 1.0f;
                    float b = (imagePixel & 0xFF) * 2.0f / 255.0f - 1.0f;

                    // Extract mask value (grayscale)
                    int maskR = (maskPixel >> 16) & 0xFF;
                    int maskG = (maskPixel >> 8) & 0xFF;
                    int maskB = maskPixel & 0xFF;
                    float maskGray = (0.299f * maskR + 0.587f * maskG + 0.114f * maskB);

                    // App: white=keep, black=hole → MI-GAN: 1=keep, 0=hole (SAME)
                    float maskBinary = maskGray >= 128f ? 1.0f : 0.0f;

                    // CHW: separate planes
                    values[pixelIdx] = maskBinary - 0.5f;                    // Channel 0
                    values[channelSize + pixelIdx] = r * maskBinary;         // Channel 1
                    values[2 * channelSize + pixelIdx] = g * maskBinary;     // Channel 2
                    values[3 * channelSize + pixelIdx] = b * maskBinary;     // Channel 3
                }
            }
        }

        floatBuffer.put(values);
        buffer.rewind();
        return buffer;
    }

    /**
     * Run inference with the TFLite interpreter.
     * Uses runForMultipleInputsOutputs for consistent behavior with QNN delegate.
     */
    private ByteBuffer runInference(ByteBuffer inputTensor) {
        // Prepare output buffer - 3 channels for RGB output
        int outputSize = 3 * modelInputWidth * modelInputHeight;
        ByteBuffer outputBuffer = ByteBuffer.allocateDirect(4 * outputSize);
        outputBuffer.order(ByteOrder.nativeOrder());

        // Use runForMultipleInputsOutputs for consistent QNN behavior
        Object[] inputs = new Object[1];
        inputs[0] = inputTensor;
        
        java.util.Map<Integer, Object> outputs = new java.util.HashMap<>();
        outputs.put(0, outputBuffer);
        
        interpreter.runForMultipleInputsOutputs(inputs, outputs);

        outputBuffer.rewind();
        return outputBuffer;
    }

    /**
     * Convert output tensor back to bitmap.
     * Handles both CHW and HWC formats.
     * 
     * Following migan_inference.py postprocessing:
     * output = ((output + 1) * 0.5 * 255).clamp(0, 255)
     */
    private Bitmap tensorToBitmap(ByteBuffer tensorBuffer, int width, int height) {
        FloatBuffer floatBuffer = tensorBuffer.asFloatBuffer();
        int totalPixels = width * height;
        
        float[] values = new float[3 * totalPixels];
        floatBuffer.get(values);

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        int[] pixels = new int[totalPixels];

        if (isHWCFormat) {
            // HWC format: [H, W, 3] - interleaved RGB
            for (int i = 0; i < totalPixels; i++) {
                int baseIdx = i * 3;
                float r = values[baseIdx];
                float g = values[baseIdx + 1];
                float b = values[baseIdx + 2];

                // Denormalize from [-1, 1] to [0, 255]
                int ri = (int) Math.max(0, Math.min(255, (r + 1.0f) * 0.5f * 255.0f + 0.5f));
                int gi = (int) Math.max(0, Math.min(255, (g + 1.0f) * 0.5f * 255.0f + 0.5f));
                int bi = (int) Math.max(0, Math.min(255, (b + 1.0f) * 0.5f * 255.0f + 0.5f));

                pixels[i] = (0xFF << 24) | (ri << 16) | (gi << 8) | bi;
            }
        } else {
            // CHW format: [3, H, W] - planar RGB
            int channelSize = totalPixels;
            for (int i = 0; i < totalPixels; i++) {
                float r = values[i];
                float g = values[channelSize + i];
                float b = values[2 * channelSize + i];

                // Denormalize from [-1, 1] to [0, 255]
                int ri = (int) Math.max(0, Math.min(255, (r + 1.0f) * 0.5f * 255.0f + 0.5f));
                int gi = (int) Math.max(0, Math.min(255, (g + 1.0f) * 0.5f * 255.0f + 0.5f));
                int bi = (int) Math.max(0, Math.min(255, (b + 1.0f) * 0.5f * 255.0f + 0.5f));

                pixels[i] = (0xFF << 24) | (ri << 16) | (gi << 8) | bi;
            }
        }

        bitmap.setPixels(pixels, 0, width, 0, 0, width, height);
        return bitmap;
    }

    /**
     * Clean up resources.
     */
    public void close() {
        if (interpreter != null) {
            interpreter.close();
        }
        if (delegates != null) {
            for (Delegate delegate : delegates.values()) {
                delegate.close();
            }
        }
    }
}
