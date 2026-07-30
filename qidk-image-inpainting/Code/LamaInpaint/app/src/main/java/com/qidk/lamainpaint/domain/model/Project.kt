package com.qidk.lamainpaint.domain.model

import android.net.Uri

/**
 * Represents an inpainting project.
 * 
 * @param id Unique project identifier
 * @param createdAt Creation timestamp (millis since epoch)
 * @param updatedAt Last update timestamp (millis since epoch)
 * @param srcUri URI of the source image
 * @param transform Current image transformation within 512×512 workspace
 * @param maskBinaryPath Path to the 512×512 binary mask file
 * @param runs List of inpainting run results
 * @param settings Project-specific settings
 */
data class Project(
    val id: String,
    val createdAt: Long,
    val updatedAt: Long,
    val srcUri: Uri,
    val transform: ImageTransform,
    val maskBinaryPath: String,
    val runs: List<RunResult>,
    val settings: ProjectSettings
)
