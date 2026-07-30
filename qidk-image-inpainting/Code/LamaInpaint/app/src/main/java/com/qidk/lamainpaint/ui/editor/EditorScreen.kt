package com.qidk.lamainpaint.ui.editor

import android.graphics.Bitmap
import android.view.ViewGroup
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.qidk.lamainpaint.DrawingView
import com.qidk.lamainpaint.domain.model.Backend

/**
 * Editor screen with drawing canvas and controls.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditorScreen(
    state: EditorState,
    onEvent: (EditorEvent) -> Unit,
    onNavigateBack: () -> Unit,
    onSetDrawingViewCallback: ((DrawingView) -> Unit)? = null,
    onBeforeStroke: ((Bitmap) -> Unit)? = null
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Image") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    // Undo/Redo disabled for now with DrawingView integration
                    IconButton(
                        onClick = { onEvent(EditorEvent.OnUndo) },
                        enabled = state.canUndo
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Undo, "Undo")
                    }
                    IconButton(
                        onClick = { onEvent(EditorEvent.OnRedo) },
                        enabled = state.canRedo
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Redo, "Redo")
                    }
                    IconButton(onClick = { onEvent(EditorEvent.OnExport) }) {
                        Icon(Icons.Default.Share, "Export")
                    }
                }
            )
        },
        floatingActionButton = {
            if (!state.isProcessing) {
                FloatingActionButton(
                    onClick = { onEvent(EditorEvent.OnRunRequested) },
                    containerColor = if (state.canRun) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                ) {
                    Icon(Icons.Default.PlayArrow, "Run Inpainting")
                }
            }
        },
        bottomBar = {
            BottomToolbar(
                state = state,
                onEvent = onEvent
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Main canvas area
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Status and backend badge
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (state.isProcessing) state.processingStatus else "Ready",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        
                        AssistChip(
                            onClick = { },
                            label = { Text("${state.modelType.displayName} • ${state.backend.name}") }
                        )
                    }
                }
                
                // Main content area - show either drawing view or result
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    // Show result if available, otherwise show drawing view
                    if (state.resultBitmap != null && !state.isProcessing) {
                        // Result view with before/after toggle
                        var showBefore by remember { mutableStateOf(false) }
                        
                        Column(
                            modifier = Modifier.fillMaxSize()
                        ) {
                            // Result image
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                contentAlignment = Alignment.Center
                            ) {
                                // beforeBitmap should always be set after inpainting
                                // It contains the same cropped region as the result
                                androidx.compose.foundation.Image(
                                    bitmap = if (showBefore) {
                                        state.beforeBitmap!!.asImageBitmap()
                                    } else {
                                        state.resultBitmap.asImageBitmap()
                                    },
                                    contentDescription = if (showBefore) "Original" else "Result",
                                    contentScale = androidx.compose.ui.layout.ContentScale.Fit,
                                    modifier = Modifier.fillMaxSize()
                                )
                                
                                // Before/After label
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(16.dp),
                                    shape = MaterialTheme.shapes.small,
                                    color = MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Text(
                                        text = if (showBefore) "BEFORE" else "AFTER",
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                            
                            // Compare controls
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                Button(
                                    onClick = { showBefore = !showBefore },
                                    modifier = Modifier.weight(1f).padding(horizontal = 4.dp)
                                ) {
                                    Icon(
                                        if (showBefore) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(if (showBefore) "Show After" else "Show Before")
                                }
                                
                                OutlinedButton(
                                    onClick = { onEvent(EditorEvent.OnEditAgain) },
                                    modifier = Modifier.weight(1f).padding(horizontal = 4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Edit,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text("Edit Again")
                                }
                            }
                        }
                    } else if (state.sourceBitmap != null && state.maskBitmap != null) {
                        // Drawing view (legacy integration)
                        var drawingView by remember { mutableStateOf<DrawingView?>(null) }
                        
                        // Update DrawingView when state changes
                        LaunchedEffect(state.brushSize) {
                            drawingView?.setBrushSize(state.brushSize)
                        }
                        
                        LaunchedEffect(state.currentTool) {
                            drawingView?.setTool(state.currentTool)
                        }
                        
                        LaunchedEffect(state.clearMaskTrigger) {
                            if (state.clearMaskTrigger > 0L) {
                                drawingView?.clearMask()
                            }
                        }
                        
                        AndroidView(
                            factory = { ctx ->
                                DrawingView(ctx).apply {
                                    layoutParams = ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    setImage(state.sourceBitmap)
                                    setBrushSize(state.brushSize)
                                    setTool(state.currentTool)
                                    
                                    // Set up before-stroke listener (for undo snapshots)
                                    setOnBeforeStrokeListener(object : DrawingView.OnBeforeStrokeListener {
                                        override fun onBeforeStroke(currentMask: Bitmap) {
                                            onBeforeStroke?.invoke(currentMask)
                                        }
                                    })
                                    
                                    // Set up mask change listener
                                    setOnMaskChangedListener(object : DrawingView.OnMaskChangedListener {
                                        override fun onMaskChanged(maskBitmap: Bitmap) {
                                            onEvent(EditorEvent.OnMaskUpdated(maskBitmap))
                                        }
                                    })
                                    
                                    drawingView = this
                                    
                                    // Set up undo/redo callback
                                    onSetDrawingViewCallback?.invoke(this)
                                }
                            },
                            update = { view ->
                                view.setBrushSize(state.brushSize)
                                view.setTool(state.currentTool)
                                view.setMaskVisible(state.maskVisible)
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
                
                // Timing info
                state.lastRunResult?.let { runResult ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Text(
                            text = "✓ Inference: ${runResult.inferenceMs}ms, Total: ${runResult.totalMs}ms",
                            modifier = Modifier.padding(8.dp),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
            
            // Processing overlay
            if (state.isProcessing) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            CircularProgressIndicator()
                            Text(state.processingStatus)
                            Text(
                                "Backend: ${state.backend.name}",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BottomToolbar(
    state: EditorState,
    onEvent: (EditorEvent) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 3.dp
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            // Tool selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                IconButton(
                    onClick = { onEvent(EditorEvent.OnToolChanged(Tool.BRUSH)) }
                ) {
                    Icon(
                        Icons.Default.Brush,
                        "Brush",
                        tint = if (state.currentTool == Tool.BRUSH) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )
                }
                IconButton(
                    onClick = { onEvent(EditorEvent.OnToolChanged(Tool.ERASER)) }
                ) {
                    Icon(
                        Icons.Default.Delete,
                        "Eraser",
                        tint = if (state.currentTool == Tool.ERASER) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )
                }
                IconButton(
                    onClick = { onEvent(EditorEvent.OnToolChanged(Tool.HAND)) }
                ) {
                    Icon(
                        Icons.Default.PanTool,
                        "Hand",
                        tint = if (state.currentTool == Tool.HAND) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )
                }
                // Transform button removed - not compatible with current DrawingView architecture
                IconButton(onClick = { onEvent(EditorEvent.OnToggleMaskVisibility) }) {
                    Icon(
                        if (state.maskVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        "Toggle Mask"
                    )
                }
                IconButton(onClick = { onEvent(EditorEvent.OnClearMask) }) {
                    Icon(Icons.Default.Clear, "Clear Mask")
                }
            }
            
            // Brush size slider
            Text("Brush Size: ${state.brushSize.toInt()}px", style = MaterialTheme.typography.bodySmall)
            Slider(
                value = state.brushSize,
                onValueChange = { onEvent(EditorEvent.OnBrushSizeChanged(it)) },
                valueRange = 5f..100f,
                modifier = Modifier.fillMaxWidth()
            )
            
            // Backend selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Backend.entries.forEach { backend ->
                    FilterChip(
                        selected = state.backend == backend,
                        onClick = { onEvent(EditorEvent.OnBackendSelected(backend)) },
                        label = { Text(backend.name) }
                    )
                }
            }
        }
    }
}
