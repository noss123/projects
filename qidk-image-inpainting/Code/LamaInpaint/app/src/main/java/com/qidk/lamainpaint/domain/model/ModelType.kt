package com.qidk.lamainpaint.domain.model

/**
 * Available inpainting model types.
 */
enum class ModelType(val displayName: String, val filename: String, val description: String) {
    /**
     * MI-GAN - Fast and lightweight (14MB)
     * Better for quick edits, runs faster on NPU
     */
    MIGAN(
        displayName = "MI-GAN",
        filename = "model.tflite",
        description = "Fast & lightweight (14MB)"
    ),
    
    /**
     * LAMA - High quality inpainting (88MB)
     * Better quality results but slower
     */
    LAMA(
        displayName = "LAMA", 
        filename = "real_lama.tflite",
        description = "High quality (88MB)"
    )
}
