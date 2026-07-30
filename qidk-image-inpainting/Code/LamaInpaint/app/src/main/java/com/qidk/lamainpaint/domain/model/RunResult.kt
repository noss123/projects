package com.qidk.lamainpaint.domain.model

/**
 * Result from a single inpainting run.
 * 
 * @param id Unique identifier for this run
 * @param backend Backend used (CPU/GPU/NPU)
 * @param inferenceMs Inference time in milliseconds
 * @param totalMs Total processing time in milliseconds
 * @param outputPath512 Path to the 512×512 output image
 */
data class RunResult(
    val id: String,
    val backend: Backend,
    val inferenceMs: Long,
    val totalMs: Long,
    val outputPath512: String
)
