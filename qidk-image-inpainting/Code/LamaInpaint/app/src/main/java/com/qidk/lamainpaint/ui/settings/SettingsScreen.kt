package com.qidk.lamainpaint.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.qidk.lamainpaint.data.AppPreferences
import com.qidk.lamainpaint.domain.model.Backend
import com.qidk.lamainpaint.domain.model.FitMode
import kotlinx.coroutines.launch

/**
 * Settings screen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    appPreferences: AppPreferences,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    
    val backend by appPreferences.backend.collectAsState(initial = Backend.CPU)
    val brushSize by appPreferences.brushSize.collectAsState(initial = 20f)
    val feather by appPreferences.feather.collectAsState(initial = 0f)
    val fitMode by appPreferences.fitMode.collectAsState(initial = FitMode.CONTAIN)
    val theme by appPreferences.theme.collectAsState(initial = "SYSTEM")
    val autosave by appPreferences.autosave.collectAsState(initial = true)
    val haptics by appPreferences.haptics.collectAsState(initial = true)
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Backend Selection
            Text("Performance Backend", style = MaterialTheme.typography.titleMedium)
            Column(modifier = Modifier.selectableGroup()) {
                Backend.entries.forEach { backendOption ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RadioButton(
                            selected = backend == backendOption,
                            onClick = {
                                scope.launch {
                                    appPreferences.setBackend(backendOption)
                                }
                            }
                        )
                        Text(
                            text = backendOption.name,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }
            
            HorizontalDivider()
            
            // Brush Defaults
            Text("Brush Defaults", style = MaterialTheme.typography.titleMedium)
            
            Text("Brush Size: ${brushSize.toInt()}px")
            Slider(
                value = brushSize,
                onValueChange = { scope.launch { appPreferences.setBrushSize(it) } },
                valueRange = 5f..100f
            )
            
            Text("Feather: ${feather.toInt()}px")
            Slider(
                value = feather,
                onValueChange = { scope.launch { appPreferences.setFeather(it) } },
                valueRange = 0f..50f
            )
            
            HorizontalDivider()
            
            // Default Fit Mode
            Text("Default Fit Mode", style = MaterialTheme.typography.titleMedium)
            Column(modifier = Modifier.selectableGroup()) {
                FitMode.entries.forEach { fitModeOption ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RadioButton(
                            selected = fitMode == fitModeOption,
                            onClick = {
                                scope.launch {
                                    appPreferences.setFitMode(fitModeOption)
                                }
                            }
                        )
                        Text(
                            text = fitModeOption.name,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }
            
            HorizontalDivider()
            
            // Theme
            Text("Theme", style = MaterialTheme.typography.titleMedium)
            Column(modifier = Modifier.selectableGroup()) {
                listOf("SYSTEM", "LIGHT", "DARK").forEach { themeOption ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RadioButton(
                            selected = theme == themeOption,
                            onClick = {
                                scope.launch {
                                    appPreferences.setTheme(themeOption)
                                }
                            }
                        )
                        Text(
                            text = themeOption,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }
            
            HorizontalDivider()
            
            // Toggles
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Autosave")
                Switch(
                    checked = autosave,
                    onCheckedChange = { scope.launch { appPreferences.setAutosave(it) } }
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Haptics")
                Switch(
                    checked = haptics,
                    onCheckedChange = { scope.launch { appPreferences.setHaptics(it) } }
                )
            }
        }
    }
}
