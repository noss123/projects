package com.qidk.lamainpaint.ui.editor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PointF
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.qidk.lamainpaint.core.graphics.MaskRasterizer
import com.qidk.lamainpaint.core.graphics.MatrixUtils
import com.qidk.lamainpaint.data.AppPreferences
import com.qidk.lamainpaint.data.FileStore
import com.qidk.lamainpaint.data.ProjectRepository
import com.qidk.lamainpaint.domain.model.*
import com.qidk.lamainpaint.domain.usecase.GenerateInput512
import com.qidk.lamainpaint.domain.usecase.RasterizeMask512
import com.qidk.lamainpaint.domain.usecase.RunInpainting
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ViewModel for the editor screen.
 */
class EditorViewModel(
    private val context: Context,
    private val projectRepository: ProjectRepository,
    private val fileStore: FileStore,
    private val appPreferences: AppPreferences,
    private val generateInput512: GenerateInput512,
    private val rasterizeMask512: RasterizeMask512,
    private val runInpainting: RunInpainting
) : ViewModel() {
    
    companion object {
        private const val TAG = "EditorViewModel"
    }
    
    private val _state = MutableStateFlow(EditorState())
    val state: StateFlow<EditorState> = _state.asStateFlow()
    
    private val undoStack = mutableListOf<EditorCommand>()
    private val redoStack = mutableListOf<EditorCommand>()
    
    // Callback to restore mask bitmap to DrawingView
    var onRestoreMask: ((Bitmap) -> Unit)? = null
    
    init {
        // Load preferences
        viewModelScope.launch {
            combine(
                appPreferences.backend,
                appPreferences.brushSize,
                appPreferences.feather,
                appPreferences.modelType
            ) { backend, brushSize, feather, modelType ->
                object {
                    val backend = backend
                    val brushSize = brushSize
                    val feather = feather
                    val modelType = modelType
                }
            }.collect { prefs ->
                _state.update { it.copy(
                    backend = prefs.backend,
                    brushSize = prefs.brushSize,
                    feather = prefs.feather,
                    modelType = prefs.modelType
                )}
            }
        }
    }
    
    /**
     * Handle editor events.
     */
    fun onEvent(event: EditorEvent) {
        when (event) {
            is EditorEvent.OnUndo -> undo()
            is EditorEvent.OnRedo -> redo()
            is EditorEvent.OnBrushSizeChanged -> updateBrushSize(event.px)
            is EditorEvent.OnFeatherChanged -> updateFeather(event.px)
            is EditorEvent.OnPointerStroke -> applyStroke(event.points, event.erasing)
            is EditorEvent.OnTransformChanged -> updateTransform(event.transform)
            is EditorEvent.OnRunRequested -> runInpainting()
            is EditorEvent.OnCompareToggle -> toggleCompare()
            is EditorEvent.OnBackendSelected -> updateBackend(event.backend)
            is EditorEvent.OnClearMask -> clearMask()
            is EditorEvent.OnResetTransform -> resetTransform()
            is EditorEvent.OnToggleMaskVisibility -> toggleMaskVisibility()
            is EditorEvent.OnCompareModeChanged -> updateCompareMode(event.mode)
            is EditorEvent.OnToolChanged -> updateTool(event.tool)
            is EditorEvent.OnMaskUpdated -> onMaskUpdated(event.maskBitmap)
            EditorEvent.OnEditAgain -> editAgain()
            EditorEvent.OnExport -> exportResult()
        }
    }
    
    /**
     * Load or create a project.
     */
    fun loadProject(srcUri: Uri) {
        viewModelScope.launch {
            try {
                // Load source bitmap
                val inputStream = context.contentResolver.openInputStream(srcUri)
                    ?: throw IllegalArgumentException("Failed to open image")
                
                val sourceBitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                
                // Use identity transform - DrawingView will handle scaling
                val initialTransform = ImageTransform.IDENTITY
                
                // Create mask
                val maskBitmap = MaskRasterizer.createEmptyMask()
                
                // Create project
                val settings = ProjectSettings(
                    backend = _state.value.backend,
                    brushSize = _state.value.brushSize,
                    feather = _state.value.feather,
                    fitMode = FitMode.CONTAIN  // Not used anymore, but kept for compatibility
                )
                
                val project = projectRepository.createProject(srcUri, settings)
                
                // Save initial mask
                fileStore.saveMask(project.id, maskBitmap)
                
                // Update state - clear old results when loading new image
                _state.update { it.copy(
                    project = project.copy(transform = initialTransform),
                    sourceBitmap = sourceBitmap,
                    maskBitmap = maskBitmap,
                    beforeBitmap = null,  // Clear old result
                    resultBitmap = null,  // Clear old result
                    transform = initialTransform,
                    canRun = false,
                    lastRunResult = null  // Clear old run info
                )}
                
                Log.i(TAG, "Project loaded: ${project.id}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load project", e)
                _state.update { it.copy(error = e.message) }
            }
        }
    }
    
    /**
     * Load project with pre-cropped bitmap (from crop screen).
     */
    fun loadProjectWithBitmap(croppedBitmap: Bitmap) {
        viewModelScope.launch {
            try {
                // Use the cropped bitmap directly
                val sourceBitmap = croppedBitmap
                
                // Use identity transform
                val initialTransform = ImageTransform.IDENTITY
                
                // Create mask
                val maskBitmap = MaskRasterizer.createEmptyMask()
                
                // Create a temporary URI for the cropped bitmap
                val tempUri = android.net.Uri.parse("content://cropped/${System.currentTimeMillis()}")
                
                // Create project
                val settings = ProjectSettings(
                    backend = _state.value.backend,
                    brushSize = _state.value.brushSize,
                    feather = _state.value.feather,
                    fitMode = FitMode.CONTAIN
                )
                
                val project = projectRepository.createProject(tempUri, settings)
                
                // Save initial mask
                fileStore.saveMask(project.id, maskBitmap)
                
                // Update state
                _state.update { it.copy(
                    project = project.copy(transform = initialTransform),
                    sourceBitmap = sourceBitmap,
                    maskBitmap = maskBitmap,
                    beforeBitmap = null,
                    resultBitmap = null,
                    transform = initialTransform,
                    canRun = false,
                    lastRunResult = null
                )}
                
                Log.i(TAG, "Project loaded with cropped bitmap: ${sourceBitmap.width}x${sourceBitmap.height}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load project with bitmap", e)
                _state.update { it.copy(error = e.message) }
            }
        }
    }
    
    private fun applyStroke(points: List<PointF>, erasing: Boolean) {
        val currentState = _state.value
        val maskBitmap = currentState.maskBitmap ?: return
        
        // Apply stroke to mask
        MaskRasterizer.applyStroke(
            maskBitmap,
            points,
            currentState.brushSize,
            currentState.feather,
            erasing
        )
        
        // Add to undo stack
        val command = EditorCommand.Stroke(
            points, currentState.brushSize,
            currentState.feather, erasing
        )
        undoStack.add(command)
        redoStack.clear()
        
        // Check if mask has pixels
        val hasMask = MaskRasterizer.hasMaskPixels(maskBitmap)
        
        // Update state
        _state.update { it.copy(
            maskBitmap = maskBitmap,
            canUndo = undoStack.isNotEmpty(),
            canRedo = false,
            canRun = hasMask
        )}
        
        // Save mask if project exists
        currentState.project?.let { project ->
            viewModelScope.launch(Dispatchers.IO) {
                fileStore.saveMask(project.id, maskBitmap)
            }
        }
    }
    
    private fun updateTransform(newTransform: ImageTransform) {
        val currentState = _state.value
        val oldTransform = currentState.transform
        
        // Clamp transform
        val sourceBitmap = currentState.sourceBitmap ?: return
        val fitMode = currentState.project?.settings?.fitMode ?: FitMode.CONTAIN
        
        val clampedTransform = MatrixUtils.clampTransform(
            newTransform,
            sourceBitmap.width,
            sourceBitmap.height,
            fitMode
        )
        
        // Add to undo stack
        val command = EditorCommand.TransformChange(oldTransform, clampedTransform)
        undoStack.add(command)
        redoStack.clear()
        
        // Update state
        _state.update { it.copy(
            transform = clampedTransform,
            canUndo = undoStack.isNotEmpty(),
            canRedo = false
        )}
    }
    
    private fun runInpainting() {
        val currentState = _state.value
        val project = currentState.project ?: return
        val sourceBitmap = currentState.sourceBitmap ?: return
        val maskBitmap = currentState.maskBitmap ?: return
        
        if (!currentState.canRun) {
            Log.w(TAG, "Run button disabled - no mask pixels")
            return
        }
        
        viewModelScope.launch {
            try {
                _state.update { it.copy(
                    isProcessing = true,
                    processingStatus = "Generating input..."
                )}
                
                // Generate 512×512 input from the current sourceBitmap
                // This is the same image shown in DrawingView, scaled to 512×512
                val input512 = withContext(Dispatchers.IO) {
                    Bitmap.createScaledBitmap(sourceBitmap, 512, 512, true)
                }
                
                _state.update { it.copy(processingStatus = "Scaling mask...") }
                
                // Scale mask to 512×512 if needed
                val mask512 = withContext(Dispatchers.IO) {
                    if (maskBitmap.width == 512 && maskBitmap.height == 512) {
                        maskBitmap
                    } else {
                        Log.i(TAG, "Scaling mask from ${maskBitmap.width}x${maskBitmap.height} to 512x512")
                        Bitmap.createScaledBitmap(maskBitmap, 512, 512, true)
                    }
                }
                
                _state.update { it.copy(processingStatus = "Processing with ${currentState.modelType.displayName} on ${currentState.backend}...") }
                
                // Run inpainting
                val runId = fileStore.generateRunId()
                val result = withContext(Dispatchers.IO) {
                    runInpainting.execute(input512, mask512, currentState.modelType, currentState.backend, runId)
                }
                
                val result512 = result.first
                var runResult = result.second
                
                _state.update { it.copy(processingStatus = "Scaling to display size...") }
                
                // Keep both input and result at 512×512 for display
                // They're already the same size and aspect ratio - no need to scale
                // ContentScale.Fit in the UI will handle displaying them properly
                val resultBitmap = result512
                val beforeBitmap = input512
                
                Log.i(TAG, "Result dimensions: ${resultBitmap.width}x${resultBitmap.height}")
                Log.i(TAG, "Before dimensions: ${beforeBitmap.width}x${beforeBitmap.height}")
                
                // Save result
                val outputPath = withContext(Dispatchers.IO) {
                    fileStore.saveResult(project.id, runId, resultBitmap)
                }
                
                runResult = runResult.copy(outputPath512 = outputPath)
                
                // Update project with new run
                val updatedProject = project.copy(
                    runs = project.runs + runResult,
                    updatedAt = System.currentTimeMillis()
                )
                projectRepository.updateProject(updatedProject)
                
                // Update state
                _state.update { it.copy(
                    isProcessing = false,
                    processingStatus = "Done ✓",
                    beforeBitmap = beforeBitmap,
                    resultBitmap = resultBitmap,
                    lastRunResult = runResult,
                    project = updatedProject
                )}
                
                Log.i(TAG, "Inpainting completed: ${runResult.inferenceMs}ms")
            } catch (e: Exception) {
                Log.e(TAG, "Inpainting failed", e)
                _state.update { it.copy(
                    isProcessing = false,
                    processingStatus = "Error",
                    error = e.message
                )}
            }
        }
    }
    
    private fun undo() {
        val currentState = _state.value
        if (currentState.undoStack.isEmpty()) {
            Log.w(TAG, "Undo stack is empty")
            return
        }
        
        // Get current mask and add to redo stack
        val currentMask = currentState.maskBitmap
        if (currentMask != null) {
            val redoSnapshot = currentMask.copy(Bitmap.Config.ARGB_8888, false)
            _state.update { it.copy(
                redoStack = it.redoStack + redoSnapshot,
                canRedo = true
            )}
        }
        
        // Pop from undo stack and restore
        val previousMask = currentState.undoStack.last()
        val newUndoStack = currentState.undoStack.dropLast(1)
        
        // Restore mask to DrawingView
        onRestoreMask?.invoke(previousMask)
        
        // Update state
        val hasMask = hasMaskPixels(previousMask)
        _state.update { it.copy(
            maskBitmap = previousMask,
            undoStack = newUndoStack,
            canUndo = newUndoStack.isNotEmpty(),
            canRun = hasMask
        )}
        
        Log.d(TAG, "Undo applied, stack size: ${newUndoStack.size}")
    }
    
    private fun redo() {
        val currentState = _state.value
        if (currentState.redoStack.isEmpty()) {
            Log.w(TAG, "Redo stack is empty")
            return
        }
        
        // Get current mask and add to undo stack
        val currentMask = currentState.maskBitmap
        if (currentMask != null) {
            val undoSnapshot = currentMask.copy(Bitmap.Config.ARGB_8888, false)
            _state.update { it.copy(
                undoStack = it.undoStack + undoSnapshot,
                canUndo = true
            )}
        }
        
        // Pop from redo stack and restore
        val nextMask = currentState.redoStack.last()
        val newRedoStack = currentState.redoStack.dropLast(1)
        
        // Restore mask to DrawingView
        onRestoreMask?.invoke(nextMask)
        
        // Update state
        val hasMask = hasMaskPixels(nextMask)
        _state.update { it.copy(
            maskBitmap = nextMask,
            redoStack = newRedoStack,
            canRedo = newRedoStack.isNotEmpty(),
            canRun = hasMask
        )}
        
        Log.d(TAG, "Redo applied, stack size: ${newRedoStack.size}")
    }
    
    private fun rebuildFromHistory() {
        val currentState = _state.value
        val maskBitmap = currentState.maskBitmap ?: return
        
        // Clear mask
        MaskRasterizer.clearMask(maskBitmap)
        
        // Replay all commands
        for (command in undoStack) {
            applyCommand(command)
        }
        
        // Check if mask has pixels
        val hasMask = MaskRasterizer.hasMaskPixels(maskBitmap)
        _state.update { it.copy(canRun = hasMask) }
    }
    
    private fun applyCommand(command: EditorCommand) {
        when (command) {
            is EditorCommand.Stroke -> {
                val maskBitmap = _state.value.maskBitmap ?: return
                MaskRasterizer.applyStroke(
                    maskBitmap,
                    command.points,
                    command.brushSize,
                    command.feather,
                    command.erasing
                )
            }
            is EditorCommand.TransformChange -> {
                _state.update { it.copy(transform = command.newTransform) }
            }
            is EditorCommand.ClearMask -> {
                val maskBitmap = _state.value.maskBitmap ?: return
                MaskRasterizer.clearMask(maskBitmap)
            }
        }
    }
    
    private fun clearMask() {
        // Trigger clear in the UI by updating timestamp
        _state.update { it.copy(
            clearMaskTrigger = System.currentTimeMillis(),
            canRun = false
        )}
        
        Log.i(TAG, "Clear mask requested")
    }
    
    private fun resetTransform() {
        val currentState = _state.value
        val source = currentState.sourceBitmap ?: return
        val fitMode = currentState.project?.settings?.fitMode ?: FitMode.CONTAIN
        
        val initialTransform = MatrixUtils.calculateInitialFit(
            source.width,
            source.height,
            fitMode
        )
        
        updateTransform(initialTransform)
    }
    
    private fun updateBrushSize(size: Float) {
        _state.update { it.copy(brushSize = size) }
        viewModelScope.launch {
            appPreferences.setBrushSize(size)
        }
    }
    
    private fun updateFeather(feather: Float) {
        _state.update { it.copy(feather = feather) }
        viewModelScope.launch {
            appPreferences.setFeather(feather)
        }
    }
    
    private fun updateBackend(backend: Backend) {
        _state.update { it.copy(backend = backend) }
        viewModelScope.launch {
            appPreferences.setBackend(backend)
        }
    }
    
    private fun toggleMaskVisibility() {
        _state.update { it.copy(maskVisible = !it.maskVisible) }
    }
    
    private fun toggleCompare() {
        _state.update { it.copy(compareActive = !it.compareActive) }
    }
    
    private fun updateCompareMode(mode: CompareMode) {
        _state.update { it.copy(compareMode = mode) }
    }
    
    private fun updateTool(tool: Tool) {
        _state.update { it.copy(currentTool = tool) }
    }
    
    /**
     * Called before a stroke starts - saves the current mask for undo.
     */
    fun onBeforeStroke(currentMask: Bitmap) {
        // Create immutable copy for undo stack BEFORE stroke is applied
        val snapshot = currentMask.copy(Bitmap.Config.ARGB_8888, false)
        _state.update { it.copy(
            undoStack = it.undoStack + snapshot,
            canUndo = true,
            redoStack = emptyList(),  // Clear redo stack on new edit
            canRedo = false
        )}
        Log.d(TAG, "Saved undo snapshot before stroke, stack size: ${_state.value.undoStack.size}, dimensions: ${snapshot.width}x${snapshot.height}")
    }
    
    private fun onMaskUpdated(maskBitmap: Bitmap) {
        // Update state with the new mask from DrawingView
        // Note: DrawingView mask is screen-sized, not 512x512
        val hasMask = hasMaskPixels(maskBitmap)
        
        _state.update { it.copy(
            maskBitmap = maskBitmap,
            canRun = hasMask
        )}
        
        Log.d(TAG, "Mask updated: ${maskBitmap.width}x${maskBitmap.height}, hasMask=$hasMask")
        
        // Save mask if project exists
        _state.value.project?.let { project ->
            viewModelScope.launch(Dispatchers.IO) {
                fileStore.saveMask(project.id, maskBitmap)
            }
        }
    }
    
    /**
     * Check if mask has any black pixels (works with any size bitmap)
     */
    private fun hasMaskPixels(mask: Bitmap): Boolean {
        val width = mask.width
        val height = mask.height
        val pixels = IntArray(width * height)
        mask.getPixels(pixels, 0, width, 0, 0, width, height)
        
        for (pixel in pixels) {
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8) and 0xFF
            val b = pixel and 0xFF
            val gray = (0.299f * r + 0.587f * g + 0.114f * b)
            
            if (gray < 128f) return true  // Found a black pixel
        }
        
        return false
    }
    
    private fun editAgain() {
        // Clear result to go back to editing mode
        _state.update { it.copy(
            resultBitmap = null,
            processingStatus = ""
        )}
        
        Log.i(TAG, "Edit again requested")
    }
    
    private fun exportResult() {
        // TODO: Implement export functionality
        Log.i(TAG, "Export requested")
    }
    
    override fun onCleared() {
        super.onCleared()
        runInpainting.cleanup()
    }
}
