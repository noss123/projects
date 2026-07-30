package com.qidk.lamainpaint.domain.model

/**
 * Represents a transformation applied to the source image within the 512×512 workspace.
 * 
 * @param scale Scale factor (1.0 = original size)
 * @param translateX Horizontal translation in pixels
 * @param translateY Vertical translation in pixels
 * @param rotationDeg Rotation angle in degrees
 */
data class ImageTransform(
    val scale: Float = 1.0f,
    val translateX: Float = 0f,
    val translateY: Float = 0f,
    val rotationDeg: Float = 0f
) {
    companion object {
        val IDENTITY = ImageTransform()
    }
}
