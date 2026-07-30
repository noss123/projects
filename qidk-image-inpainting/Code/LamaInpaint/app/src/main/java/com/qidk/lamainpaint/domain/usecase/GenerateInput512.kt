package com.qidk.lamainpaint.domain.usecase

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.net.Uri
import com.qidk.lamainpaint.core.graphics.MatrixUtils
import com.qidk.lamainpaint.domain.model.Constants
import com.qidk.lamainpaint.domain.model.ImageTransform

/**
 * Use case to generate a 512×512 input bitmap from the source image with transform applied.
 */
class GenerateInput512(private val context: Context) {
    
    /**
     * Generate 512×512 input bitmap.
     * 
     * @param srcUri Source image URI
     * @param transform Transform to apply
     * @return 512×512 bitmap ready for model input
     */
    fun execute(srcUri: Uri, transform: ImageTransform): Bitmap {
        // Load source bitmap
        val inputStream = context.contentResolver.openInputStream(srcUri)
            ?: throw IllegalArgumentException("Failed to open image URI")
        
        val sourceBitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
        inputStream.close()
        
        // Create 512×512 workspace bitmap
        val workspaceSize = Constants.WORKSPACE_SIZE
        val workspaceBitmap = Bitmap.createBitmap(
            workspaceSize,
            workspaceSize,
            Bitmap.Config.ARGB_8888
        )
        
        // Apply transform and render source into workspace
        val canvas = Canvas(workspaceBitmap)
        val matrix = MatrixUtils.createMatrix(transform)
        canvas.drawBitmap(sourceBitmap, matrix, null)
        
        return workspaceBitmap
    }
}
