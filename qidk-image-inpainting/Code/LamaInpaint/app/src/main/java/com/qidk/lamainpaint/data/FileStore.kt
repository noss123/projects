package com.qidk.lamainpaint.data

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import com.qidk.lamainpaint.domain.model.Constants
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

/**
 * Manages file storage for projects, masks, and results.
 */
class FileStore(private val context: Context) {
    
    private val projectsDir: File by lazy {
        File(context.filesDir, "projects").apply { mkdirs() }
    }
    
    companion object {
        private const val TAG = "FileStore"
        private const val MASK_FILENAME = "mask.png"
        private const val RESULT_PREFIX = "result_"
    }
    
    /**
     * Create a new project directory.
     * 
     * @param projectId Unique project identifier
     * @return Project directory
     */
    fun createProjectDir(projectId: String): File {
        return File(projectsDir, projectId).apply {
            mkdirs()
        }
    }
    
    /**
     * Get project directory.
     * 
     * @param projectId Project identifier
     * @return Project directory
     */
    fun getProjectDir(projectId: String): File {
        return File(projectsDir, projectId)
    }
    
    /**
     * Save mask bitmap to project directory.
     * 
     * @param projectId Project identifier
     * @param mask Mask bitmap (512×512)
     * @return Path to saved mask file
     */
    fun saveMask(projectId: String, mask: Bitmap): String {
        val projectDir = getProjectDir(projectId)
        val maskFile = File(projectDir, MASK_FILENAME)
        
        try {
            FileOutputStream(maskFile).use { out ->
                mask.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            Log.i(TAG, "Saved mask: ${maskFile.absolutePath}")
            return maskFile.absolutePath
        } catch (e: IOException) {
            Log.e(TAG, "Failed to save mask", e)
            throw e
        }
    }
    
    /**
     * Load mask bitmap from project directory.
     * 
     * @param maskPath Path to mask file
     * @return Mask bitmap or null if not found
     */
    fun loadMask(maskPath: String): Bitmap? {
        val file = File(maskPath)
        return if (file.exists()) {
            android.graphics.BitmapFactory.decodeFile(maskPath)
        } else {
            null
        }
    }
    
    /**
     * Save result bitmap to project directory.
     * 
     * @param projectId Project identifier
     * @param runId Run identifier
     * @param result Result bitmap (512×512)
     * @return Path to saved result file
     */
    fun saveResult(projectId: String, runId: String, result: Bitmap): String {
        val projectDir = getProjectDir(projectId)
        val resultFile = File(projectDir, "$RESULT_PREFIX$runId.png")
        
        try {
            FileOutputStream(resultFile).use { out ->
                result.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            Log.i(TAG, "Saved result: ${resultFile.absolutePath}")
            return resultFile.absolutePath
        } catch (e: IOException) {
            Log.e(TAG, "Failed to save result", e)
            throw e
        }
    }
    
    /**
     * Load result bitmap.
     * 
     * @param resultPath Path to result file
     * @return Result bitmap or null if not found
     */
    fun loadResult(resultPath: String): Bitmap? {
        val file = File(resultPath)
        return if (file.exists()) {
            android.graphics.BitmapFactory.decodeFile(resultPath)
        } else {
            null
        }
    }
    
    /**
     * Delete project directory and all its contents.
     * 
     * @param projectId Project identifier
     */
    fun deleteProject(projectId: String) {
        val projectDir = getProjectDir(projectId)
        if (projectDir.exists()) {
            projectDir.deleteRecursively()
            Log.i(TAG, "Deleted project: $projectId")
        }
    }
    
    /**
     * List all project directories.
     * 
     * @return List of project IDs
     */
    fun listProjects(): List<String> {
        return projectsDir.listFiles()?.mapNotNull { it.name } ?: emptyList()
    }
    
    /**
     * Generate a unique project ID.
     * 
     * @return Unique project ID
     */
    fun generateProjectId(): String {
        return UUID.randomUUID().toString()
    }
    
    /**
     * Generate a unique run ID.
     * 
     * @return Unique run ID
     */
    fun generateRunId(): String {
        return UUID.randomUUID().toString()
    }
}
