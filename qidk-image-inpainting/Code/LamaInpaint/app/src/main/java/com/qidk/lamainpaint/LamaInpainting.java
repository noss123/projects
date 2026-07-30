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
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class LamaInpainting {
    private static final String TAG = "LamaInpainting";

    private final Interpreter interpreter;
    private final Map<TFLiteHelpers.DelegateType, Delegate> delegates;
    private final int modelInputHeight;
    private final int modelInputWidth;
    private final DataType inputDataType;
    private final DataType outputDataType;
    private final boolean normalizeToMinus1To1;
    private final boolean isHWCFormat; // true = HWC [1,H,W,3], false = CHW [1,3,H,W]

    /**
     * Create a LamaInpainting inference engine.
     *
     * @param context              Android application context
     * @param modelFilename        Filename of the TFLite model in assets
     * @param enabledDelegates     Set of delegates to enable (NPU, GPU, or empty for CPU-only)
     * @param normalizeToMinus1To1 Whether to normalize inputs to [-1, 1] instead of [0, 1]
     * @throws Exception if model loading fails
     */
    public LamaInpainting(Context context, String modelFilename, Set<TFLiteHelpers.DelegateType> enabledDelegates, boolean normalizeToMinus1To1) throws Exception {
        this.normalizeToMinus1To1 = normalizeToMinus1To1;
        
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
            // CPU-only mode: empty delegate array, will use XNNPack
            Log.i(TAG, "CPU-only mode requested");
            delegatePriorityOrder = new TFLiteHelpers.DelegateType[][] { {} };
        } else {
            // Use AI Hub defaults filtered by enabled delegates
            Log.i(TAG, "Enabled delegates: " + enabledDelegates.toString());
            delegatePriorityOrder = AIHubDefaults.delegatePriorityOrderForDelegates(enabledDelegates);
            Log.i(TAG, "Delegate priority order combinations: " + delegatePriorityOrder.length);
            for (int i = 0; i < delegatePriorityOrder.length; i++) {
                Log.i(TAG, "  Combination " + i + ": " + java.util.Arrays.toString(delegatePriorityOrder[i]));
            }
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
        Tensor inputImageTensor = interpreter.getInputTensor(0);
        Tensor outputTensor = interpreter.getOutputTensor(0);

        int[] inputImageShape = inputImageTensor.shape();
        this.inputDataType = inputImageTensor.dataType();
        this.outputDataType = outputTensor.dataType();

        // Expecting input shape: [1, 3, Height, Width] for CHW format
        // or [1, Height, Width, 3] for HWC format
        if (inputImageShape.length != 4) {
            throw new RuntimeException("Expected 4D input tensor, got: " + inputImageShape.length);
        }

        // Detect if CHW or HWC format
        if (inputImageShape[1] == 3) {
            // CHW format: [1, 3, H, W]
            this.isHWCFormat = false;
            this.modelInputHeight = inputImageShape[2];
            this.modelInputWidth = inputImageShape[3];
        } else if (inputImageShape[3] == 3) {
            // HWC format: [1, H, W, 3]
            this.isHWCFormat = true;
            this.modelInputHeight = inputImageShape[1];
            this.modelInputWidth = inputImageShape[2];
        } else {
            throw new RuntimeException("Could not determine image format from shape: " + java.util.Arrays.toString(inputImageShape));
        }

        Log.i(TAG, "Model loaded successfully");
        Log.i(TAG, "Input shape: " + java.util.Arrays.toString(inputImageShape));
        Log.i(TAG, "Model format: " + (isHWCFormat ? "HWC" : "CHW"));
        Log.i(TAG, "Model size: " + modelInputWidth + "x" + modelInputHeight);
        Log.i(TAG, "Input data type: " + inputDataType);
        Log.i(TAG, "Output data type: " + outputDataType);
        Log.i(TAG, "Active delegates: " + delegates.keySet().toString());
    }

    /**
     * Perform inpainting on the given image and mask.
     *
     * @param inputBitmap Input image
     * @param maskBitmap  Mask image (white = keep, black = inpaint/remove)
     * @return Pair of (result bitmap, inference time in ms)
     */
    public Pair<Bitmap, Long> inpaint(Bitmap inputBitmap, Bitmap maskBitmap) {
        long startTime = System.currentTimeMillis();

        // Preprocess: resize and convert to tensors
        Bitmap resizedInput = Bitmap.createScaledBitmap(inputBitmap, modelInputWidth, modelInputHeight, true);
        Bitmap resizedMask = Bitmap.createScaledBitmap(maskBitmap, modelInputWidth, modelInputHeight, true);

        ByteBuffer imageTensor = bitmapToTensor(resizedInput, normalizeToMinus1To1);
        ByteBuffer maskTensor = maskBitmapToTensor(resizedMask);

        long preprocessTime = System.currentTimeMillis() - startTime;

        // Run inference
        long inferenceStart = System.currentTimeMillis();
        ByteBuffer outputTensor = runInference(imageTensor, maskTensor);
        long inferenceTime = System.currentTimeMillis() - inferenceStart;

        // Postprocess: convert output tensor to bitmap
        Bitmap resultBitmap = tensorToBitmap(outputTensor, modelInputWidth, modelInputHeight, normalizeToMinus1To1);

        long totalTime = System.currentTimeMillis() - startTime;

        Log.i(TAG, "Preprocessing time: " + preprocessTime + " ms");
        Log.i(TAG, "Inference time: " + inferenceTime + " ms");
        Log.i(TAG, "Total time: " + totalTime + " ms");

        return new Pair<>(resultBitmap, inferenceTime);
    }

    /**
     * Convert bitmap to tensor in CHW or HWC format based on model requirements.
     */
    private ByteBuffer bitmapToTensor(Bitmap bitmap, boolean normalizeMinus1To1) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int totalSize = width * height * 3;
        
        ByteBuffer buffer = ByteBuffer.allocateDirect(4 * totalSize);
        buffer.order(ByteOrder.nativeOrder());
        FloatBuffer floatBuffer = buffer.asFloatBuffer();

        int[] pixels = new int[width * height];
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height);

        float[] values = new float[totalSize];
        
        if (isHWCFormat) {
            // HWC format: [H, W, 3] - interleaved RGB
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    int pixel = pixels[y * width + x];
                    int idx = (y * width + x) * 3;
                    
                    float r = ((pixel >> 16) & 0xFF) / 255.0f;
                    float g = ((pixel >> 8) & 0xFF) / 255.0f;
                    float b = (pixel & 0xFF) / 255.0f;

                    if (normalizeMinus1To1) {
                        r = r * 2.0f - 1.0f;
                        g = g * 2.0f - 1.0f;
                        b = b * 2.0f - 1.0f;
                    }

                    values[idx] = r;
                    values[idx + 1] = g;
                    values[idx + 2] = b;
                }
            }
        } else {
            // CHW format: R plane, then G, then B
            int channelSize = width * height;
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    int pixel = pixels[y * width + x];
                    int idx = y * width + x;
                    
                    float r = ((pixel >> 16) & 0xFF) / 255.0f;
                    float g = ((pixel >> 8) & 0xFF) / 255.0f;
                    float b = (pixel & 0xFF) / 255.0f;

                    if (normalizeMinus1To1) {
                        r = r * 2.0f - 1.0f;
                        g = g * 2.0f - 1.0f;
                        b = b * 2.0f - 1.0f;
                    }

                    values[idx] = r;  // R channel
                    values[channelSize + idx] = g;  // G channel
                    values[2 * channelSize + idx] = b;  // B channel
                }
            }
        }
        
        floatBuffer.put(values);
        buffer.rewind();
        return buffer;
    }

    /**
     * Convert mask bitmap to tensor (1 channel, CHW format).
     * Black pixels (drawn mask) = 1.0 (hole to inpaint)
     * White pixels (background) = 0.0 (keep original)
     */
    private ByteBuffer maskBitmapToTensor(Bitmap maskBitmap) {
        int width = maskBitmap.getWidth();
        int height = maskBitmap.getHeight();
        
        ByteBuffer buffer = ByteBuffer.allocateDirect(4 * width * height);
        buffer.order(ByteOrder.nativeOrder());
        FloatBuffer floatBuffer = buffer.asFloatBuffer();

        int[] pixels = new int[width * height];
        maskBitmap.getPixels(pixels, 0, width, 0, 0, width, height);

        float[] values = new float[width * height];
        for (int i = 0; i < pixels.length; i++) {
            int pixel = pixels[i];
            int r = (pixel >> 16) & 0xFF;
            int g = (pixel >> 8) & 0xFF;
            int b = pixel & 0xFF;
            
            // Convert to grayscale
            float gray = (0.299f * r + 0.587f * g + 0.114f * b);
            
            // Black (drawn mask) = 1.0 (inpaint), White = 0.0 (keep)
            values[i] = gray < 128f ? 1.0f : 0.0f;
        }
        
        floatBuffer.put(values);
        buffer.rewind();
        return buffer;
    }

    /**
     * Run inference with the TFLite interpreter.
     */
    private ByteBuffer runInference(ByteBuffer imageTensor, ByteBuffer maskTensor) {
        // Prepare output buffer
        int outputSize = 3 * modelInputWidth * modelInputHeight;
        ByteBuffer outputBuffer = ByteBuffer.allocateDirect(4 * outputSize);
        outputBuffer.order(ByteOrder.nativeOrder());

        // Prepare input/output maps
        Object[] inputs = new Object[2];
        inputs[0] = imageTensor;
        inputs[1] = maskTensor;

        Map<Integer, Object> outputs = new java.util.HashMap<>();
        outputs.put(0, outputBuffer);

        // Run inference
        interpreter.runForMultipleInputsOutputs(inputs, outputs);

        outputBuffer.rewind();
        return outputBuffer;
    }

    /**
     * Convert output tensor (CHW or HWC format) back to bitmap.
     */
    private Bitmap tensorToBitmap(ByteBuffer tensorBuffer, int width, int height, boolean denormalizeFromMinus1To1) {
        FloatBuffer floatBuffer = tensorBuffer.asFloatBuffer();
        int totalSize = width * height * 3;
        
        float[] values = new float[totalSize];
        floatBuffer.get(values);

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        int[] pixels = new int[width * height];

        if (isHWCFormat) {
            // HWC format: [H, W, 3] - interleaved RGB
            for (int i = 0; i < pixels.length; i++) {
                int idx = i * 3;
                float r = values[idx];
                float g = values[idx + 1];
                float b = values[idx + 2];

                if (denormalizeFromMinus1To1) {
                    r = (r + 1.0f) * 0.5f;
                    g = (g + 1.0f) * 0.5f;
                    b = (b + 1.0f) * 0.5f;
                }

                // Clamp and convert to int
                int ri = (int) Math.max(0, Math.min(255, r * 255.0f + 0.5f));
                int gi = (int) Math.max(0, Math.min(255, g * 255.0f + 0.5f));
                int bi = (int) Math.max(0, Math.min(255, b * 255.0f + 0.5f));

                pixels[i] = (0xFF << 24) | (ri << 16) | (gi << 8) | bi;
            }
        } else {
            // CHW format: R plane, then G, then B
            int channelSize = width * height;
            for (int i = 0; i < channelSize; i++) {
                float r = values[i];
                float g = values[channelSize + i];
                float b = values[2 * channelSize + i];

                if (denormalizeFromMinus1To1) {
                    r = (r + 1.0f) * 0.5f;
                    g = (g + 1.0f) * 0.5f;
                    b = (b + 1.0f) * 0.5f;
                }

                // Clamp and convert to int
                int ri = (int) Math.max(0, Math.min(255, r * 255.0f + 0.5f));
                int gi = (int) Math.max(0, Math.min(255, g * 255.0f + 0.5f));
                int bi = (int) Math.max(0, Math.min(255, b * 255.0f + 0.5f));

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
