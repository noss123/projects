package com.qidk.lamainpaint

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.qidk.lamainpaint.data.AppPreferences
import com.qidk.lamainpaint.data.FileStore
import com.qidk.lamainpaint.data.ProjectRepository
import com.qidk.lamainpaint.domain.model.FitMode
import com.qidk.lamainpaint.domain.model.ModelType
import com.qidk.lamainpaint.domain.usecase.GenerateInput512
import com.qidk.lamainpaint.domain.usecase.RasterizeMask512
import com.qidk.lamainpaint.domain.usecase.RunInpainting
import com.qidk.lamainpaint.ui.editor.EditorScreen
import com.qidk.lamainpaint.ui.editor.EditorViewModel
import com.qidk.lamainpaint.ui.home.HomeScreen
import com.qidk.lamainpaint.ui.settings.SettingsScreen
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var appPreferences: AppPreferences
    private lateinit var fileStore: FileStore
    private lateinit var projectRepository: ProjectRepository
    private lateinit var editorViewModel: EditorViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize dependencies
        appPreferences = AppPreferences(this)
        fileStore = FileStore(this)
        projectRepository = ProjectRepository(this, fileStore)
        
        // Initialize use cases
        val generateInput512 = GenerateInput512(this)
        val rasterizeMask512 = RasterizeMask512()
        val runInpainting = RunInpainting(this)
        
        // Initialize ViewModel
        editorViewModel = EditorViewModel(
            context = this,
            projectRepository = projectRepository,
            fileStore = fileStore,
            appPreferences = appPreferences,
            generateInput512 = generateInput512,
            rasterizeMask512 = rasterizeMask512,
            runInpainting = runInpainting
        )

        
        setContent {
            val theme by appPreferences.theme.collectAsState(initial = "SYSTEM")
            val darkTheme = when (theme) {
                "DARK" -> true
                "LIGHT" -> false
                else -> isSystemInDarkTheme()
            }
            
            MaterialTheme(
                colorScheme = if (darkTheme) darkColorScheme() else lightColorScheme()
            ) {
                LamaInpaintApp(
                    editorViewModel = editorViewModel,
                    appPreferences = appPreferences
                )
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // Cleanup is handled in ViewModel
    }
}

@Composable
fun LamaInpaintApp(
    editorViewModel: EditorViewModel,
    appPreferences: AppPreferences
) {
    val navController = rememberNavController()
    val editorState by editorViewModel.state.collectAsState()
    val scope = rememberCoroutineScope()
    
    var selectedImageUri by remember { mutableStateOf<android.net.Uri?>(null) }
    
    // Model selection state
    val selectedModel by appPreferences.modelType.collectAsState(initial = ModelType.MIGAN)
    
    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onImageSelected = { uri ->
                    selectedImageUri = uri
                    navController.navigate("crop")
                },
                onNavigateToSettings = {
                    navController.navigate("settings")
                },
                selectedModel = selectedModel,
                onModelSelected = { model ->
                    scope.launch {
                        appPreferences.setModelType(model)
                    }
                }
            )
        }
        
        composable("crop") {
            selectedImageUri?.let { uri ->
                com.qidk.lamainpaint.ui.crop.CropScreen(
                    imageUri = uri,
                    onCropConfirmed = { croppedBitmap ->
                        editorViewModel.loadProjectWithBitmap(croppedBitmap)
                        navController.navigate("editor") {
                            popUpTo("home")
                        }
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
        
        composable("editor") {
            EditorScreen(
                state = editorState,
                onEvent = { event -> editorViewModel.onEvent(event) },
                onNavigateBack = {
                    navController.popBackStack()
                },
                onSetDrawingViewCallback = { drawingView ->
                    // Wire up undo/redo mask restoration callback
                    editorViewModel.onRestoreMask = { maskBitmap ->
                        drawingView.setMaskBitmap(maskBitmap)
                    }
                },
                onBeforeStroke = { currentMask ->
                    // Save snapshot before stroke is applied
                    editorViewModel.onBeforeStroke(currentMask)
                }
            )
        }
        
        composable("settings") {
            SettingsScreen(
                appPreferences = appPreferences,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}