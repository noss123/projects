package com.qidk.lamainpaint.ui.editor

import android.graphics.PointF
import com.qidk.lamainpaint.domain.model.Backend
import com.qidk.lamainpaint.domain.model.ImageTransform

/**
 * Events that can occur in the editor.
 */
sealed interface EditorEvent {
    data object OnUndo : EditorEvent
    data object OnRedo : EditorEvent
    data class OnBrushSizeChanged(val px: Float) : EditorEvent
    data class OnFeatherChanged(val px: Float) : EditorEvent
    data class OnPointerStroke(val points: List<PointF>, val erasing: Boolean) : EditorEvent
    data class OnTransformChanged(val transform: ImageTransform) : EditorEvent
    data object OnRunRequested : EditorEvent
    data object OnCompareToggle : EditorEvent
    data class OnBackendSelected(val backend: Backend) : EditorEvent
    data object OnClearMask : EditorEvent
    data object OnResetTransform : EditorEvent
    data object OnToggleMaskVisibility : EditorEvent
    data class OnCompareModeChanged(val mode: CompareMode) : EditorEvent
    data class OnToolChanged(val tool: Tool) : EditorEvent
    data class OnMaskUpdated(val maskBitmap: android.graphics.Bitmap) : EditorEvent
    data object OnEditAgain : EditorEvent
    data object OnExport : EditorEvent
}

/**
 * Compare modes for before/after comparison.
 */
enum class CompareMode {
    NONE,
    HOLD_TO_COMPARE,
    SPLIT_SLIDER,
    SIDE_BY_SIDE
}

/**
 * Tool types available in the editor.
 */
enum class Tool {
    BRUSH,
    ERASER,
    HAND,
    TRANSFORM
}
