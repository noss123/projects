// ---------------------------------------------------------------------
// Copyright (c) 2025 Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause
// ---------------------------------------------------------------------
package com.qidk.lamainpaint.tflite;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class AIHubDefaults {
    // Delegates enabled to replicate AI Hub's defaults on Qualcomm devices.
    public static final Set<TFLiteHelpers.DelegateType> enabledDelegates = new HashSet<>(Arrays.asList(
            TFLiteHelpers.DelegateType.QNN_NPU,
            TFLiteHelpers.DelegateType.GPUv2
    ));

    // Number of threads AI Hub uses by default for layers running on CPU.
    // https://app.aihub.qualcomm.com/docs/hub/api.html#profile-inference-options
    public static final int numCPUThreads = 4;

    // The default delegate registry order for AI Hub.
    // For more details, see the JavaDoc for TFLiteHelpers::CreateInterpreterAndDelegatesFromOptions.
    public static final TFLiteHelpers.DelegateType[][] delegatePriorityOrder = new TFLiteHelpers.DelegateType[][] {
            // 1. QNN_NPU + GPUv2 + XNNPack
            // https://app.aihub.qualcomm.com/docs/hub/api.html#profile-inference-options
            // Similar to AI Hub "compute_unit=all", or "compute_unit=npu,gpu,cpu" on QC devices that support QNN
            // AI Hub sets some GPUv2 settings that are not accessible via the Java API.
            { TFLiteHelpers.DelegateType.QNN_NPU, TFLiteHelpers.DelegateType.GPUv2 },

            // 2. QNN_NPU only + XNNPack
            // For devices with NPU support, try NPU-only before GPU
            { TFLiteHelpers.DelegateType.QNN_NPU },

            // 3. GPUv2 + XNNPack
            // https://app.aihub.qualcomm.com/docs/hub/api.html#profile-inference-options
            // Similar to AI Hub "compute_unit=gpu" on all devices
            // AI Hub sets some GPU settings that are not accessible via the Java API.
            { TFLiteHelpers.DelegateType.GPUv2 },

            // 4. XNNPack (final, CPU-only fallback)
            // https://app.aihub.qualcomm.com/docs/hub/api.html#profile-inference-options
            // Same as AI Hub "compute_unit=cpu" on all devices
            { }

            // ------
            //
            // Additional delegates (eg. NNAPI, or something targeting non-Qualcomm hardware) could be added here or above,
            // if you desire to define a custom delegate selection order.
            //
            // ------
    };

    // Create a version of the above delegate priority order that can only use the provided delegates.
    public static TFLiteHelpers.DelegateType[][] delegatePriorityOrderForDelegates(Set<TFLiteHelpers.DelegateType> enabledDelegates) {
        return Arrays.stream(delegatePriorityOrder)
                .filter(combination -> {
                    // Check if all delegates in this combination are enabled
                    // If combination is empty, it means CPU-only, which is always valid
                    if (combination.length == 0) return true;
                    
                    for (TFLiteHelpers.DelegateType delegate : combination) {
                        if (!enabledDelegates.contains(delegate)) {
                            return false;
                        }
                    }
                    return true;
                })
                .toArray(TFLiteHelpers.DelegateType[][]::new);
    }
}
