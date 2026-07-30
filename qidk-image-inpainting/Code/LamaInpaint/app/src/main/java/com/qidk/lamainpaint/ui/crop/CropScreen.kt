package com.qidk.lamainpaint.ui.crop

import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.max
import kotlin.math.min

/**
 * Crop screen that forces square selection for 512×512 processing.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CropScreen(
    imageUri: Uri,
    onCropConfirmed: (Bitmap) -> Unit,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var sourceBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    
    // Crop rectangle in image coordinates
    var cropRect by remember { mutableStateOf<Rect?>(null) }
    
    // Load image
    LaunchedEffect(imageUri) {
        try {
            isLoading = true
            sourceBitmap = withContext(Dispatchers.IO) {
                val inputStream = context.contentResolver.openInputStream(imageUri)
                    ?: throw IllegalArgumentException("Failed to open image")
                android.graphics.BitmapFactory.decodeStream(inputStream).also {
                    inputStream.close()
                }
            }
            
            // Initialize crop to center square
            sourceBitmap?.let { bitmap ->
                val size = min(bitmap.width, bitmap.height).toFloat()
                val left = (bitmap.width - size) / 2f
                val top = (bitmap.height - size) / 2f
                cropRect = Rect(left, top, left + size, top + size)
            }
            
            isLoading = false
        } catch (e: Exception) {
            error = e.message
            isLoading = false
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Square Region") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            scope.launch {
                                sourceBitmap?.let { bitmap ->
                                    cropRect?.let { rect ->
                                        // Crop and scale the bitmap to 512x512
                                        val cropped = withContext(Dispatchers.IO) {
                                            // Clamp crop rect to image bounds
                                            val clampedLeft = rect.left.coerceIn(0f, bitmap.width.toFloat())
                                            val clampedTop = rect.top.coerceIn(0f, bitmap.height.toFloat())
                                            val clampedRight = rect.right.coerceIn(0f, bitmap.width.toFloat())
                                            val clampedBottom = rect.bottom.coerceIn(0f, bitmap.height.toFloat())
                                            
                                            val cropWidth = (clampedRight - clampedLeft).coerceAtLeast(1f)
                                            val cropHeight = (clampedBottom - clampedTop).coerceAtLeast(1f)
                                            
                                            // If crop rect extends beyond image, create canvas with padding
                                            if (rect.left < 0 || rect.top < 0 || 
                                                rect.right > bitmap.width || rect.bottom > bitmap.height) {
                                                
                                                // Create a larger canvas
                                                val canvas = android.graphics.Canvas()
                                                val output = Bitmap.createBitmap(
                                                    rect.width.toInt(), 
                                                    rect.height.toInt(), 
                                                    Bitmap.Config.ARGB_8888
                                                )
                                                canvas.setBitmap(output)
                                                
                                                // Fill with white background
                                                canvas.drawColor(android.graphics.Color.WHITE)
                                                
                                                // Calculate offset for image on canvas
                                                val srcLeft = clampedLeft.toInt()
                                                val srcTop = clampedTop.toInt()
                                                val dstLeft = (clampedLeft - rect.left).toInt()
                                                val dstTop = (clampedTop - rect.top).toInt()
                                                
                                                // Draw the image portion
                                                val croppedPortion = Bitmap.createBitmap(
                                                    bitmap,
                                                    srcLeft,
                                                    srcTop,
                                                    cropWidth.toInt(),
                                                    cropHeight.toInt()
                                                )
                                                
                                                canvas.drawBitmap(
                                                    croppedPortion,
                                                    dstLeft.toFloat(),
                                                    dstTop.toFloat(),
                                                    null
                                                )
                                                
                                                croppedPortion.recycle()
                                                output
                                            } else {
                                                // Normal crop within bounds
                                                Bitmap.createBitmap(
                                                    bitmap,
                                                    clampedLeft.toInt(),
                                                    clampedTop.toInt(),
                                                    cropWidth.toInt(),
                                                    cropHeight.toInt()
                                                )
                                            }
                                        }
                                        onCropConfirmed(cropped)
                                    }
                                }
                            }
                        },
                        enabled = cropRect != null && sourceBitmap != null
                    ) {
                        Icon(Icons.Filled.Check, "Confirm")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentAlignment = Alignment.Center
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator()
                }
                error != null -> {
                    Text("Error: $error")
                }
                sourceBitmap != null && cropRect != null -> {
                    CropView(
                        bitmap = sourceBitmap!!,
                        cropRect = cropRect!!,
                        onCropRectChanged = { cropRect = it }
                    )
                }
            }
        }
    }
}

@Composable
fun CropView(
    bitmap: Bitmap,
    cropRect: Rect,
    onCropRectChanged: (Rect) -> Unit
) {
    val density = LocalDensity.current
    val cornerHandleSize = with(density) { 40.dp.toPx() }
    
    var draggedHandle by remember { mutableStateOf<CropHandle?>(null) }
    var dragStartRect by remember { mutableStateOf(cropRect) }
    var currentDragOffset by remember { mutableStateOf(Offset.Zero) }
    
    BoxWithConstraints(
        modifier = Modifier.fillMaxSize()
    ) {
        val viewWidth = constraints.maxWidth.toFloat()
        val viewHeight = constraints.maxHeight.toFloat()
        
        // Calculate scale to fit image in view
        val scaleX = viewWidth / bitmap.width
        val scaleY = viewHeight / bitmap.height
        val scale = min(scaleX, scaleY)
        
        val scaledWidth = bitmap.width * scale
        val scaledHeight = bitmap.height * scale
        val offsetX = (viewWidth - scaledWidth) / 2f
        val offsetY = (viewHeight - scaledHeight) / 2f
        
        // Convert image coordinates to view coordinates
        fun imageToView(imageCoord: Offset): Offset {
            return Offset(
                offsetX + imageCoord.x * scale,
                offsetY + imageCoord.y * scale
            )
        }
        
        // Convert view coordinates to image coordinates
        fun viewToImage(viewCoord: Offset): Offset {
            return Offset(
                (viewCoord.x - offsetX) / scale,
                (viewCoord.y - offsetY) / scale
            )
        }
        
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onPress = { pos ->
                            val imagePos = viewToImage(pos)
                            
                            // Check which handle was pressed
                            draggedHandle = when {
                                // Top-left corner
                                (imagePos - cropRect.topLeft).getDistance() < cornerHandleSize / scale -> CropHandle.TOP_LEFT
                                // Top-right corner
                                (imagePos - cropRect.topRight).getDistance() < cornerHandleSize / scale -> CropHandle.TOP_RIGHT
                                // Bottom-left corner
                                (imagePos - cropRect.bottomLeft).getDistance() < cornerHandleSize / scale -> CropHandle.BOTTOM_LEFT
                                // Bottom-right corner
                                (imagePos - cropRect.bottomRight).getDistance() < cornerHandleSize / scale -> CropHandle.BOTTOM_RIGHT
                                // Inside crop rect - move entire rect
                                cropRect.contains(imagePos) -> CropHandle.MOVE
                                else -> null
                            }
                            
                            dragStartRect = cropRect
                            currentDragOffset = Offset.Zero
                        }
                    )
                }
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { currentDragOffset = Offset.Zero },
                        onDragEnd = { 
                            draggedHandle = null
                            currentDragOffset = Offset.Zero
                        },
                        onDragCancel = { 
                            draggedHandle = null 
                            currentDragOffset = Offset.Zero
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            
                            draggedHandle?.let { handle ->
                                // Accumulate drag offset
                                currentDragOffset += dragAmount / scale
                                
                                // Minimum crop size: 50px (allows smaller crops with upscaling)
                                val minSize = 50f
                                // No maximum - allow cropping beyond image bounds for upscaling
                                
                                val newRect = when (handle) {
                                    CropHandle.MOVE -> {
                                        // Move entire rectangle (no bounds restriction for flexibility)
                                        val newLeft = dragStartRect.left + currentDragOffset.x
                                        val newTop = dragStartRect.top + currentDragOffset.y
                                        Rect(
                                            newLeft,
                                            newTop,
                                            newLeft + dragStartRect.width,
                                            newTop + dragStartRect.height
                                        )
                                    }
                                    CropHandle.TOP_LEFT -> {
                                        // Resize from top-left, maintain square
                                        val delta = min(currentDragOffset.x, currentDragOffset.y)
                                        val newSize = (dragStartRect.width - delta).coerceAtLeast(minSize)
                                        val newLeft = dragStartRect.right - newSize
                                        val newTop = dragStartRect.bottom - newSize
                                        Rect(newLeft, newTop, dragStartRect.right, dragStartRect.bottom)
                                    }
                                    CropHandle.TOP_RIGHT -> {
                                        val delta = max(currentDragOffset.x, -currentDragOffset.y)
                                        val newSize = (dragStartRect.width + delta).coerceAtLeast(minSize)
                                        val newTop = dragStartRect.bottom - newSize
                                        Rect(dragStartRect.left, newTop, dragStartRect.left + newSize, dragStartRect.bottom)
                                    }
                                    CropHandle.BOTTOM_LEFT -> {
                                        val delta = max(-currentDragOffset.x, currentDragOffset.y)
                                        val newSize = (dragStartRect.width + delta).coerceAtLeast(minSize)
                                        val newLeft = dragStartRect.right - newSize
                                        Rect(newLeft, dragStartRect.top, dragStartRect.right, dragStartRect.top + newSize)
                                    }
                                    CropHandle.BOTTOM_RIGHT -> {
                                        val delta = max(currentDragOffset.x, currentDragOffset.y)
                                        val newSize = (dragStartRect.width + delta).coerceAtLeast(minSize)
                                        Rect(dragStartRect.left, dragStartRect.top, dragStartRect.left + newSize, dragStartRect.top + newSize)
                                    }
                                }
                                
                                onCropRectChanged(newRect)
                            }
                        }
                    )
                }
        ) {
            // Draw the image
            drawImage(
                image = bitmap.asImageBitmap(),
                dstOffset = androidx.compose.ui.unit.IntOffset(offsetX.toInt(), offsetY.toInt()),
                dstSize = androidx.compose.ui.unit.IntSize(scaledWidth.toInt(), scaledHeight.toInt())
            )
            
            // Draw darkened overlay outside crop area
            val cropTopLeft = imageToView(cropRect.topLeft)
            val cropSize = cropRect.width * scale
            
            // Top overlay
            drawRect(
                color = Color.Black.copy(alpha = 0.5f),
                topLeft = Offset(offsetX, offsetY),
                size = Size(scaledWidth, cropTopLeft.y - offsetY)
            )
            
            // Bottom overlay
            drawRect(
                color = Color.Black.copy(alpha = 0.5f),
                topLeft = Offset(offsetX, cropTopLeft.y + cropSize),
                size = Size(scaledWidth, offsetY + scaledHeight - (cropTopLeft.y + cropSize))
            )
            
            // Left overlay
            drawRect(
                color = Color.Black.copy(alpha = 0.5f),
                topLeft = Offset(offsetX, cropTopLeft.y),
                size = Size(cropTopLeft.x - offsetX, cropSize)
            )
            
            // Right overlay
            drawRect(
                color = Color.Black.copy(alpha = 0.5f),
                topLeft = Offset(cropTopLeft.x + cropSize, cropTopLeft.y),
                size = Size(offsetX + scaledWidth - (cropTopLeft.x + cropSize), cropSize)
            )
            
            // Draw crop rectangle border
            drawRect(
                color = Color.White,
                topLeft = cropTopLeft,
                size = Size(cropSize, cropSize),
                style = Stroke(width = 3f)
            )
            
            // Draw grid lines (rule of thirds)
            val gridThird = cropSize / 3f
            for (i in 1..2) {
                // Vertical lines
                drawLine(
                    color = Color.White.copy(alpha = 0.5f),
                    start = Offset(cropTopLeft.x + gridThird * i, cropTopLeft.y),
                    end = Offset(cropTopLeft.x + gridThird * i, cropTopLeft.y + cropSize),
                    strokeWidth = 1f
                )
                // Horizontal lines
                drawLine(
                    color = Color.White.copy(alpha = 0.5f),
                    start = Offset(cropTopLeft.x, cropTopLeft.y + gridThird * i),
                    end = Offset(cropTopLeft.x + cropSize, cropTopLeft.y + gridThird * i),
                    strokeWidth = 1f
                )
            }
            
            // Draw corner handles
            val handleRadius = cornerHandleSize / 2f
            listOf(
                cropTopLeft,
                Offset(cropTopLeft.x + cropSize, cropTopLeft.y),
                Offset(cropTopLeft.x, cropTopLeft.y + cropSize),
                Offset(cropTopLeft.x + cropSize, cropTopLeft.y + cropSize)
            ).forEach { corner ->
                drawCircle(
                    color = Color.White,
                    radius = handleRadius,
                    center = corner
                )
                drawCircle(
                    color = Color.Blue,
                    radius = handleRadius - 3f,
                    center = corner
                )
            }
        }
        
        // Instructions
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            color = Color.Black.copy(alpha = 0.7f),
            shape = MaterialTheme.shapes.small
        ) {
            Text(
                text = "Drag corners to resize • Drag center to move • Crop anywhere",
                modifier = Modifier.padding(12.dp),
                color = Color.White,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

enum class CropHandle {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    MOVE
}
