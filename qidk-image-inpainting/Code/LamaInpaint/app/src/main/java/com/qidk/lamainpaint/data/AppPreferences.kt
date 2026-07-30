package com.qidk.lamainpaint.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.qidk.lamainpaint.domain.model.Backend
import com.qidk.lamainpaint.domain.model.FitMode
import com.qidk.lamainpaint.domain.model.ModelType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "app_preferences")

/**
 * Manages user preferences using DataStore.
 */
class AppPreferences(private val context: Context) {
    
    private val dataStore = context.dataStore
    
    companion object {
        private val BACKEND_KEY = stringPreferencesKey("backend")
        private val MODEL_TYPE_KEY = stringPreferencesKey("model_type")
        private val BRUSH_SIZE_KEY = floatPreferencesKey("brush_size")
        private val FEATHER_KEY = floatPreferencesKey("feather")
        private val FIT_MODE_KEY = stringPreferencesKey("fit_mode")
        private val THEME_KEY = stringPreferencesKey("theme")
        private val AUTOSAVE_KEY = booleanPreferencesKey("autosave")
        private val HAPTICS_KEY = booleanPreferencesKey("haptics")
        
        private const val DEFAULT_BRUSH_SIZE = 20f
        private const val DEFAULT_FEATHER = 0f
    }
    
    /**
     * Get model type preference flow.
     */
    val modelType: Flow<ModelType> = dataStore.data.map { prefs ->
        val modelTypeStr = prefs[MODEL_TYPE_KEY] ?: ModelType.MIGAN.name
        try {
            ModelType.valueOf(modelTypeStr)
        } catch (e: IllegalArgumentException) {
            ModelType.MIGAN
        }
    }
    
    /**
     * Set model type preference.
     */
    suspend fun setModelType(modelType: ModelType) {
        dataStore.edit { prefs ->
            prefs[MODEL_TYPE_KEY] = modelType.name
        }
    }
    
    /**
     * Get backend preference flow.
     */
    val backend: Flow<Backend> = dataStore.data.map { prefs ->
        val backendStr = prefs[BACKEND_KEY] ?: Backend.CPU.name
        try {
            Backend.valueOf(backendStr)
        } catch (e: IllegalArgumentException) {
            Backend.CPU
        }
    }
    
    /**
     * Set backend preference.
     */
    suspend fun setBackend(backend: Backend) {
        dataStore.edit { prefs ->
            prefs[BACKEND_KEY] = backend.name
        }
    }
    
    /**
     * Get brush size preference flow.
     */
    val brushSize: Flow<Float> = dataStore.data.map { prefs ->
        prefs[BRUSH_SIZE_KEY] ?: DEFAULT_BRUSH_SIZE
    }
    
    /**
     * Set brush size preference.
     */
    suspend fun setBrushSize(size: Float) {
        dataStore.edit { prefs ->
            prefs[BRUSH_SIZE_KEY] = size
        }
    }
    
    /**
     * Get feather preference flow.
     */
    val feather: Flow<Float> = dataStore.data.map { prefs ->
        prefs[FEATHER_KEY] ?: DEFAULT_FEATHER
    }
    
    /**
     * Set feather preference.
     */
    suspend fun setFeather(feather: Float) {
        dataStore.edit { prefs ->
            prefs[FEATHER_KEY] = feather
        }
    }
    
    /**
     * Get fit mode preference flow.
     */
    val fitMode: Flow<FitMode> = dataStore.data.map { prefs ->
        val fitModeStr = prefs[FIT_MODE_KEY] ?: FitMode.CONTAIN.name
        try {
            FitMode.valueOf(fitModeStr)
        } catch (e: IllegalArgumentException) {
            FitMode.CONTAIN
        }
    }
    
    /**
     * Set fit mode preference.
     */
    suspend fun setFitMode(fitMode: FitMode) {
        dataStore.edit { prefs ->
            prefs[FIT_MODE_KEY] = fitMode.name
        }
    }
    
    /**
     * Get theme preference flow.
     */
    val theme: Flow<String> = dataStore.data.map { prefs ->
        prefs[THEME_KEY] ?: "SYSTEM"
    }
    
    /**
     * Set theme preference.
     */
    suspend fun setTheme(theme: String) {
        dataStore.edit { prefs ->
            prefs[THEME_KEY] = theme
        }
    }
    
    /**
     * Get autosave preference flow.
     */
    val autosave: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[AUTOSAVE_KEY] ?: true
    }
    
    /**
     * Set autosave preference.
     */
    suspend fun setAutosave(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[AUTOSAVE_KEY] = enabled
        }
    }
    
    /**
     * Get haptics preference flow.
     */
    val haptics: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[HAPTICS_KEY] ?: true
    }
    
    /**
     * Set haptics preference.
     */
    suspend fun setHaptics(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[HAPTICS_KEY] = enabled
        }
    }
}
