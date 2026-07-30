package com.qidk.lamainpaint.core.graphics

import android.graphics.Matrix
import android.graphics.PointF
import android.graphics.RectF
import com.qidk.lamainpaint.domain.model.Constants
import com.qidk.lamainpaint.domain.model.FitMode
import com.qidk.lamainpaint.domain.model.ImageTransform
import kotlin.math.cos
import kotlin.math.sin

/**
 * Utilities for matrix transformations and coordinate conversions.
 */
object MatrixUtils {
    
    /**
     * Create an Android Matrix from ImageTransform.
     * 
     * @param transform The image transformation
     * @return Android Matrix representation
     */
    fun createMatrix(transform: ImageTransform): Matrix {
        return Matrix().apply {
            postTranslate(transform.translateX, transform.translateY)
            postScale(transform.scale, transform.scale)
            postRotate(transform.rotationDeg)
        }
    }
    
    /**
     * Calculate initial transform to fit source image into 512×512 workspace.
     * 
     * @param sourceWidth Source image width in pixels
     * @param sourceHeight Source image height in pixels
     * @param fitMode How to fit the image (CONTAIN or COVER)
     * @return ImageTransform to apply
     */
    fun calculateInitialFit(
        sourceWidth: Int,
        sourceHeight: Int,
        fitMode: FitMode
    ): ImageTransform {
        val workspaceSize = Constants.WORKSPACE_SIZE.toFloat()
        
        val scaleX = workspaceSize / sourceWidth
        val scaleY = workspaceSize / sourceHeight
        
        val scale = when (fitMode) {
            FitMode.CONTAIN -> minOf(scaleX, scaleY) // Fit entire image
            FitMode.COVER -> maxOf(scaleX, scaleY)   // Fill workspace
        }
        
        // Center the image
        val scaledWidth = sourceWidth * scale
        val scaledHeight = sourceHeight * scale
        val translateX = (workspaceSize - scaledWidth) / 2f
        val translateY = (workspaceSize - scaledHeight) / 2f
        
        return ImageTransform(
            scale = scale,
            translateX = translateX,
            translateY = translateY,
            rotationDeg = 0f
        )
    }
    
    /**
     * Clamp transform to keep image within workspace bounds.
     * 
     * @param transform Current transform
     * @param sourceWidth Source image width
     * @param sourceHeight Source image height
     * @param fitMode Current fit mode
     * @return Clamped transform
     */
    fun clampTransform(
        transform: ImageTransform,
        sourceWidth: Int,
        sourceHeight: Int,
        fitMode: FitMode
    ): ImageTransform {
        val workspaceSize = Constants.WORKSPACE_SIZE.toFloat()
        
        // Minimum scale to cover workspace (for COVER mode)
        val minScaleX = workspaceSize / sourceWidth
        val minScaleY = workspaceSize / sourceHeight
        val minScale = when (fitMode) {
            FitMode.CONTAIN -> 0.1f  // Allow zooming out
            FitMode.COVER -> maxOf(minScaleX, minScaleY)  // Must fill workspace
        }
        
        val clampedScale = transform.scale.coerceAtLeast(minScale)
        
        // Clamp translation to keep image within/covering workspace
        val newScaledWidth = sourceWidth * clampedScale
        val newScaledHeight = sourceHeight * clampedScale
        
        val maxTranslateX = when (fitMode) {
            FitMode.CONTAIN -> workspaceSize  // Allow going off-screen
            FitMode.COVER -> 0f  // Left edge can't go past left workspace edge
        }
        val minTranslateX = when (fitMode) {
            FitMode.CONTAIN -> -newScaledWidth
            FitMode.COVER -> workspaceSize - newScaledWidth
        }
        
        val maxTranslateY = when (fitMode) {
            FitMode.CONTAIN -> workspaceSize
            FitMode.COVER -> 0f
        }
        val minTranslateY = when (fitMode) {
            FitMode.CONTAIN -> -newScaledHeight
            FitMode.COVER -> workspaceSize - newScaledHeight
        }
        
        return transform.copy(
            scale = clampedScale,
            translateX = transform.translateX.coerceIn(minTranslateX, maxTranslateX),
            translateY = transform.translateY.coerceIn(minTranslateY, maxTranslateY)
        )
    }
    
    /**
     * Check if current transform is valid for the given fit mode.
     * 
     * @param transform Current transform
     * @param sourceWidth Source image width
     * @param sourceHeight Source image height
     * @param fitMode Current fit mode
     * @return true if valid, false otherwise
     */
    fun isTransformValid(
        transform: ImageTransform,
        sourceWidth: Int,
        sourceHeight: Int,
        fitMode: FitMode
    ): Boolean {
        if (fitMode == FitMode.CONTAIN) return true
        
        // For COVER mode, check if workspace is fully covered
        val workspaceSize = Constants.WORKSPACE_SIZE.toFloat()
        val scaledWidth = sourceWidth * transform.scale
        val scaledHeight = sourceHeight * transform.scale
        
        val left = transform.translateX
        val top = transform.translateY
        val right = left + scaledWidth
        val bottom = top + scaledHeight
        
        // Workspace must be fully covered
        return left <= 0 && top <= 0 && right >= workspaceSize && bottom >= workspaceSize
    }
    
    /**
     * Convert view coordinates to workspace coordinates.
     * 
     * @param viewX X coordinate in view space
     * @param viewY Y coordinate in view space
     * @param viewToWorkspaceMatrix Matrix for conversion
     * @return Point in workspace coordinates
     */
    fun viewToWorkspace(viewX: Float, viewY: Float, viewToWorkspaceMatrix: Matrix): PointF {
        val point = floatArrayOf(viewX, viewY)
        viewToWorkspaceMatrix.mapPoints(point)
        return PointF(point[0], point[1])
    }
    
    /**
     * Convert workspace coordinates to view coordinates.
     * 
     * @param workspaceX X coordinate in workspace
     * @param workspaceY Y coordinate in workspace
     * @param workspaceToViewMatrix Matrix for conversion
     * @return Point in view coordinates
     */
    fun workspaceToView(workspaceX: Float, workspaceY: Float, workspaceToViewMatrix: Matrix): PointF {
        val point = floatArrayOf(workspaceX, workspaceY)
        workspaceToViewMatrix.mapPoints(point)
        return PointF(point[0], point[1])
    }
}
