package com.qidk.lamainpaint.domain.model

/**
 * Settings specific to a project.
 * 
 * @param backend Preferred backend for inference
 * @param brushSize Default brush size in pixels
 * @param feather Brush feathering amount in pixels
 * @param fitMode How to fit the source image into 512×512 workspace
 */
data class ProjectSettings(
    val backend: Backend = Backend.CPU,
    val brushSize: Float = 20f,
    val feather: Float = 0f,
    val fitMode: FitMode = FitMode.CONTAIN
)

enum class FitMode {
    /** Entire image visible inside 512×512; letterbox allowed */
    CONTAIN,
    /** 512×512 filled; cropping overflow */
    COVER
}
