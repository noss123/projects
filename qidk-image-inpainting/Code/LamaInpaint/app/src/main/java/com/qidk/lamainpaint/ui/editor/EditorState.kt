package com.qidk.lamainpaint.ui.editor

import android.graphics.Bitmap
import android.graphics.PointF
import com.qidk.lamainpaint.domain.model.Backend
import com.qidk.lamainpaint.domain.model.ImageTransform
import com.qidk.lamainpaint.domain.model.ModelType
import com.qidk.lamainpaint.domain.model.Project
import com.qidk.lamainpaint.domain.model.RunResult

/**
 * UI state for the editor screen.
 */
data class EditorState(
    val project: Project? = null,
    val sourceBitmap: Bitmap? = null,
    val maskBitmap: Bitmap? = null,
    val beforeBitmap: Bitmap? = null,  // Scaled version for comparison (matches result dimensions)
    val resultBitmap: Bitmap? = null,
    val currentTool: Tool = Tool.BRUSH,
    val brushSize: Float = 20f,
    val feather: Float = 0f,
    val transform: ImageTransform = ImageTransform.IDENTITY,
    val maskVisible: Boolean = true,
    val compareMode: CompareMode = CompareMode.NONE,
    val compareActive: Boolean = false,
    val splitSliderPosition: Float = 0.5f,
    val isProcessing: Boolean = false,
    val processingStatus: String = "",
    val lastRunResult: RunResult? = null,
    val canUndo: Boolean = false,
    val canRedo: Boolean = false,
    val canRun: Boolean = false,
    val backend: Backend = Backend.CPU,
    val modelType: ModelType = ModelType.MIGAN,
    val error: String? = null,
    val clearMaskTrigger: Long = 0L,  // Timestamp to trigger clear in UI
    val undoStack: List<Bitmap> = emptyList(),  // Stack of mask bitmap snapshots for undo
    val redoStack: List<Bitmap> = emptyList()   // Stack of mask bitmap snapshots for redo
)

/**
 * Command for undo/redo system.
 */
sealed class EditorCommand {
    data class Stroke(
        val points: List<PointF>,
        val brushSize: Float,
        val feather: Float,
        val erasing: Boolean
    ) : EditorCommand()
    
    data class TransformChange(
        val oldTransform: ImageTransform,
        val newTransform: ImageTransform
    ) : EditorCommand()
    
    data object ClearMask : EditorCommand()
}
