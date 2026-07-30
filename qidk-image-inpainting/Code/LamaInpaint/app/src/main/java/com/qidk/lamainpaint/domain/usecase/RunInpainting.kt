package com.qidk.lamainpaint.domain.usecase

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import android.util.Pair
import com.qidk.lamainpaint.LamaInpainting
import com.qidk.lamainpaint.MiganInpainting
import com.qidk.lamainpaint.domain.model.Backend
import com.qidk.lamainpaint.domain.model.ModelType
import com.qidk.lamainpaint.domain.model.RunResult
import com.qidk.lamainpaint.tflite.TFLiteHelpers
import java.util.HashSet
import java.util.EnumMap

/**
 * Inpainting engine interface for polymorphic model handling.
 */
interface InpaintingEngine {
    fun inpaint(input: Bitmap, mask: Bitmap): Pair<Bitmap, Long>
    fun close()
}

/**
 * Wrapper for MiganInpainting to implement common interface.
 */
class MiganEngine(
    context: Context,
    filename: String,
    delegates: Set<TFLiteHelpers.DelegateType>
) : InpaintingEngine {
    private val engine = MiganInpainting(context, filename, delegates)
    
    override fun inpaint(input: Bitmap, mask: Bitmap): Pair<Bitmap, Long> = engine.inpaint(input, mask)
    override fun close() = engine.close()
}

/**
 * Wrapper for LamaInpainting to implement common interface.
 */
class LamaEngine(
    context: Context,
    filename: String,
    delegates: Set<TFLiteHelpers.DelegateType>,
    normalizeToMinus1To1: Boolean = true
) : InpaintingEngine {
    private val engine = LamaInpainting(context, filename, delegates, normalizeToMinus1To1)
    
    override fun inpaint(input: Bitmap, mask: Bitmap): Pair<Bitmap, Long> = engine.inpaint(input, mask)
    override fun close() = engine.close()
}

/**
 * Key for caching model instances by model type and backend combination.
 */
data class ModelBackendKey(val modelType: ModelType, val backend: Backend)

/**
 * Use case to run inpainting inference.
 * Supports both MI-GAN and LAMA models with runtime selection.
 * 
 * OPTIMIZATION: Keeps separate interpreter instances for each model+backend combo
 * to avoid re-initialization overhead when switching.
 */
class RunInpainting(private val context: Context) {
    
    companion object {
        private const val TAG = "RunInpainting"
    }
    
    // Cache instances by model type and backend combination
    private val engineCache: MutableMap<ModelBackendKey, InpaintingEngine> = mutableMapOf()
    private var currentKey: ModelBackendKey? = null
    
    /**
     * Execute inpainting with specified model and backend.
     * 
     * @param input512 512×512 input bitmap
     * @param mask512 512×512 mask bitmap
     * @param modelType Model to use (MIGAN or LAMA)
     * @param backend Backend to use (CPU/GPU/NPU)
     * @param runId Unique run identifier
     * @return Pair of (result bitmap, RunResult with timing info)
     */
    fun execute(
        input512: Bitmap,
        mask512: Bitmap,
        modelType: ModelType,
        backend: Backend,
        runId: String
    ): Pair<Bitmap, RunResult> {
        val startTime = System.currentTimeMillis()
        val key = ModelBackendKey(modelType, backend)
        
        // Get or create engine for requested model+backend combo
        var engine = engineCache[key]
        
        if (engine == null) {
            Log.i(TAG, "Initializing ${modelType.displayName} model with backend: $backend")
            
            // Determine delegates based on backend
            val enabledDelegates = HashSet<TFLiteHelpers.DelegateType>()
            when (backend) {
                Backend.CPU -> {
                    Log.i(TAG, "Using CPU backend (XNNPack)")
                }
                Backend.GPU -> {
                    enabledDelegates.add(TFLiteHelpers.DelegateType.GPUv2)
                    Log.i(TAG, "Using GPU backend")
                }
                Backend.NPU -> {
                    enabledDelegates.add(TFLiteHelpers.DelegateType.QNN_NPU)
                    Log.i(TAG, "Using NPU backend")
                }
            }
            
            try {
                engine = when (modelType) {
                    ModelType.MIGAN -> MiganEngine(context, modelType.filename, enabledDelegates)
                    // real_lama.tflite expects [0,1] normalized input, not [-1,1]
                    ModelType.LAMA -> LamaEngine(context, modelType.filename, enabledDelegates, false)
                }
                engineCache[key] = engine
                Log.i(TAG, "Successfully initialized ${modelType.displayName} with $backend (cached)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize ${modelType.displayName} with $backend", e)
                
                // Fallback to CPU if not already trying CPU
                if (backend != Backend.CPU) {
                    Log.w(TAG, "Falling back to CPU backend")
                    return execute(input512, mask512, modelType, Backend.CPU, runId)
                } else {
                    throw RuntimeException("Failed to initialize ${modelType.displayName} on CPU", e)
                }
            }
        } else {
            Log.i(TAG, "Using cached ${modelType.displayName} + $backend instance")
        }
        
        currentKey = key
        
        // Run inference
        val result = engine.inpaint(input512, mask512)
        val outputBitmap = result.first
        val inferenceMs = result.second
        
        val totalMs = System.currentTimeMillis() - startTime
        
        Log.i(TAG, "${modelType.displayName} inference: ${inferenceMs}ms inference, ${totalMs}ms total")
        
        val runResult = RunResult(
            id = runId,
            backend = backend,
            inferenceMs = inferenceMs,
            totalMs = totalMs,
            outputPath512 = ""
        )
        
        return Pair(outputBitmap, runResult)
    }
    
    /**
     * Execute inpainting (backward compatible - uses MIGAN by default).
     */
    fun execute(
        input512: Bitmap,
        mask512: Bitmap,
        backend: Backend,
        runId: String
    ): Pair<Bitmap, RunResult> {
        return execute(input512, mask512, ModelType.MIGAN, backend, runId)
    }
    
    /**
     * Clean up all cached engine instances.
     */
    fun cleanup() {
        for ((key, engine) in engineCache) {
            Log.i(TAG, "Closing ${key.modelType.displayName} + ${key.backend} instance")
            engine.close()
        }
        engineCache.clear()
        currentKey = null
    }
    
    /**
     * Clean up instances for a specific model type.
     */
    fun cleanupModel(modelType: ModelType) {
        val keysToRemove = engineCache.keys.filter { it.modelType == modelType }
        for (key in keysToRemove) {
            Log.i(TAG, "Closing ${key.modelType.displayName} + ${key.backend} instance")
            engineCache[key]?.close()
            engineCache.remove(key)
        }
        if (currentKey?.modelType == modelType) {
            currentKey = null
        }
    }
    
    /**
     * Clean up instances for a specific backend.
     */
    fun cleanupBackend(backend: Backend) {
        val keysToRemove = engineCache.keys.filter { it.backend == backend }
        for (key in keysToRemove) {
            Log.i(TAG, "Closing ${key.modelType.displayName} + ${key.backend} instance")
            engineCache[key]?.close()
            engineCache.remove(key)
        }
        if (currentKey?.backend == backend) {
            currentKey = null
        }
    }
}
