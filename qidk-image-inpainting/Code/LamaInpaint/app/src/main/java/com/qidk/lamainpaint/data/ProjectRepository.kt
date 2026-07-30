package com.qidk.lamainpaint.data

import android.content.Context
import android.net.Uri
import android.util.Log
import com.qidk.lamainpaint.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Repository for managing projects.
 */
class ProjectRepository(
    private val context: Context,
    private val fileStore: FileStore
) {
    
    companion object {
        private const val TAG = "ProjectRepository"
        private const val PROJECT_METADATA_FILE = "project.json"
    }
    
    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: Flow<List<Project>> = _projects.asStateFlow()
    
    init {
        loadProjects()
    }
    
    /**
     * Load all projects from storage.
     */
    private fun loadProjects() {
        val projectIds = fileStore.listProjects()
        val loadedProjects = projectIds.mapNotNull { projectId ->
            try {
                loadProject(projectId)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load project: $projectId", e)
                null
            }
        }
        _projects.value = loadedProjects.sortedByDescending { it.updatedAt }
    }
    
    /**
     * Load a single project from storage.
     * 
     * @param projectId Project identifier
     * @return Project or null if not found
     */
    private fun loadProject(projectId: String): Project? {
        val projectDir = fileStore.getProjectDir(projectId)
        val metadataFile = File(projectDir, PROJECT_METADATA_FILE)
        
        if (!metadataFile.exists()) return null
        
        return try {
            val json = JSONObject(metadataFile.readText())
            
            Project(
                id = json.getString("id"),
                createdAt = json.getLong("createdAt"),
                updatedAt = json.getLong("updatedAt"),
                srcUri = Uri.parse(json.getString("srcUri")),
                transform = parseTransform(json.getJSONObject("transform")),
                maskBinaryPath = json.getString("maskBinaryPath"),
                runs = parseRuns(json.getJSONArray("runs")),
                settings = parseSettings(json.getJSONObject("settings"))
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse project metadata", e)
            null
        }
    }
    
    /**
     * Create a new project.
     * 
     * @param srcUri Source image URI
     * @param settings Initial settings
     * @return Created project
     */
    fun createProject(srcUri: Uri, settings: ProjectSettings): Project {
        val projectId = fileStore.generateProjectId()
        val projectDir = fileStore.createProjectDir(projectId)
        
        val now = System.currentTimeMillis()
        val maskPath = File(projectDir, "mask.png").absolutePath
        
        val project = Project(
            id = projectId,
            createdAt = now,
            updatedAt = now,
            srcUri = srcUri,
            transform = ImageTransform.IDENTITY,
            maskBinaryPath = maskPath,
            runs = emptyList(),
            settings = settings
        )
        
        saveProject(project)
        loadProjects()
        
        return project
    }
    
    /**
     * Update an existing project.
     * 
     * @param project Updated project
     */
    fun updateProject(project: Project) {
        val updatedProject = project.copy(updatedAt = System.currentTimeMillis())
        saveProject(updatedProject)
        loadProjects()
    }
    
    /**
     * Delete a project.
     * 
     * @param projectId Project identifier
     */
    fun deleteProject(projectId: String) {
        fileStore.deleteProject(projectId)
        loadProjects()
    }
    
    /**
     * Save project metadata to storage.
     * 
     * @param project Project to save
     */
    private fun saveProject(project: Project) {
        val projectDir = fileStore.getProjectDir(project.id)
        val metadataFile = File(projectDir, PROJECT_METADATA_FILE)
        
        val json = JSONObject().apply {
            put("id", project.id)
            put("createdAt", project.createdAt)
            put("updatedAt", project.updatedAt)
            put("srcUri", project.srcUri.toString())
            put("transform", serializeTransform(project.transform))
            put("maskBinaryPath", project.maskBinaryPath)
            put("runs", serializeRuns(project.runs))
            put("settings", serializeSettings(project.settings))
        }
        
        metadataFile.writeText(json.toString(2))
    }
    
    private fun parseTransform(json: JSONObject): ImageTransform {
        return ImageTransform(
            scale = json.getDouble("scale").toFloat(),
            translateX = json.getDouble("translateX").toFloat(),
            translateY = json.getDouble("translateY").toFloat(),
            rotationDeg = json.getDouble("rotationDeg").toFloat()
        )
    }
    
    private fun serializeTransform(transform: ImageTransform): JSONObject {
        return JSONObject().apply {
            put("scale", transform.scale)
            put("translateX", transform.translateX)
            put("translateY", transform.translateY)
            put("rotationDeg", transform.rotationDeg)
        }
    }
    
    private fun parseRuns(jsonArray: JSONArray): List<RunResult> {
        val runs = mutableListOf<RunResult>()
        for (i in 0 until jsonArray.length()) {
            val json = jsonArray.getJSONObject(i)
            runs.add(
                RunResult(
                    id = json.getString("id"),
                    backend = Backend.valueOf(json.getString("backend")),
                    inferenceMs = json.getLong("inferenceMs"),
                    totalMs = json.getLong("totalMs"),
                    outputPath512 = json.getString("outputPath512")
                )
            )
        }
        return runs
    }
    
    private fun serializeRuns(runs: List<RunResult>): JSONArray {
        val jsonArray = JSONArray()
        for (run in runs) {
            jsonArray.put(JSONObject().apply {
                put("id", run.id)
                put("backend", run.backend.name)
                put("inferenceMs", run.inferenceMs)
                put("totalMs", run.totalMs)
                put("outputPath512", run.outputPath512)
            })
        }
        return jsonArray
    }
    
    private fun parseSettings(json: JSONObject): ProjectSettings {
        return ProjectSettings(
            backend = Backend.valueOf(json.getString("backend")),
            brushSize = json.getDouble("brushSize").toFloat(),
            feather = json.getDouble("feather").toFloat(),
            fitMode = FitMode.valueOf(json.getString("fitMode"))
        )
    }
    
    private fun serializeSettings(settings: ProjectSettings): JSONObject {
        return JSONObject().apply {
            put("backend", settings.backend.name)
            put("brushSize", settings.brushSize)
            put("feather", settings.feather)
            put("fitMode", settings.fitMode.name)
        }
    }
}
