'use client';

import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Facebook,
    FileArchive,
    FileSpreadsheet,
    Instagram,
    Linkedin,
    Loader2,
    UploadCloud,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    getManualUploadPath,
    ManualInstagramUploadScope,
    ManualPlatform,
    ManualUploadMode,
    ManualUploadResult,
    uploadManualInsights,
} from '@/lib/api/manual-insights-api';

type PlatformTheme = {
    title: string;
    accountParam: 'ig_user_id' | 'fb_user_id' | 'li_org_id';
    accountLabel: string;
    Icon: typeof Instagram;
    panelBorder: string;
    panelHeaderBg: string;
    accentText: string;
    badgeClass: string;
    endpointClass: string;
    submitClass: string;
    infoClass: string;
    dropzoneClass: string;
    dropzoneActiveClass: string;
};

const PLATFORM_THEMES: Record<ManualPlatform, PlatformTheme> = {
    insta: {
        title: 'Instagram',
        accountParam: 'ig_user_id',
        accountLabel: 'Instagram User ID',
        Icon: Instagram,
        panelBorder: 'border-violet-200',
        panelHeaderBg: 'bg-gradient-to-r from-violet-50 via-fuchsia-50 to-indigo-50',
        accentText: 'text-violet-700',
        badgeClass: 'border-violet-200 bg-violet-100 text-violet-700',
        endpointClass: 'border-violet-200 bg-violet-50 text-violet-800',
        submitClass: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-300',
        infoClass: 'text-violet-700',
        dropzoneClass: 'border-violet-200 bg-violet-50/70',
        dropzoneActiveClass: 'border-violet-400 bg-violet-100/70',
    },
    facebook: {
        title: 'Facebook',
        accountParam: 'fb_user_id',
        accountLabel: 'Facebook User ID',
        Icon: Facebook,
        panelBorder: 'border-blue-200',
        panelHeaderBg: 'bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50',
        accentText: 'text-blue-700',
        badgeClass: 'border-blue-200 bg-blue-100 text-blue-700',
        endpointClass: 'border-blue-200 bg-blue-50 text-blue-800',
        submitClass: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-300',
        infoClass: 'text-blue-700',
        dropzoneClass: 'border-blue-200 bg-blue-50/70',
        dropzoneActiveClass: 'border-blue-400 bg-blue-100/70',
    },
    linkedin: {
        title: 'LinkedIn',
        accountParam: 'li_org_id',
        accountLabel: 'LinkedIn Org ID',
        Icon: Linkedin,
        panelBorder: 'border-sky-200',
        panelHeaderBg: 'bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50',
        accentText: 'text-sky-700',
        badgeClass: 'border-sky-200 bg-sky-100 text-sky-700',
        endpointClass: 'border-sky-200 bg-sky-50 text-sky-800',
        submitClass: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-300',
        infoClass: 'text-sky-700',
        dropzoneClass: 'border-sky-200 bg-sky-50/70',
        dropzoneActiveClass: 'border-sky-400 bg-sky-100/70',
    },
};

const DEFAULT_ACCOUNT_ID = 'ClubArtizen';

function isCsvFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.csv');
}

function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.zip');
}

function isXlsFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.xls');
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSuccessStats(success: ManualUploadResult): Array<{ label: string; value: number }> {
    const stats: Array<{ label: string; value: number }> = [];

    if (typeof success.processed_posts === 'number') {
        stats.push({ label: 'Processed posts', value: success.processed_posts });
    }
    if (typeof success.processed_files === 'number') {
        stats.push({ label: 'Processed files', value: success.processed_files });
    }
    if (typeof success.touched_dates === 'number') {
        stats.push({ label: 'Touched dates', value: success.touched_dates });
    }
    if (typeof success.created_entries === 'number') {
        stats.push({ label: 'Created rows', value: success.created_entries });
    }
    if (typeof success.updated_entries === 'number') {
        stats.push({ label: 'Updated rows', value: success.updated_entries });
    }

    return stats;
}

export default function ManualUploadPage() {
    const [platform, setPlatform] = useState<ManualPlatform>('insta');
    const [instagramScope, setInstagramScope] = useState<ManualInstagramUploadScope>('channelwise');
    const [uploadMode, setUploadMode] = useState<ManualUploadMode>('csv');
    const [accountId, setAccountId] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [success, setSuccess] = useState<ManualUploadResult | null>(null);
    const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const theme = PLATFORM_THEMES[platform];
    const isInstagramPosts = platform === 'insta' && instagramScope === 'posts';
    const isLinkedIn = platform === 'linkedin';

    const endpointResolved = useMemo(() => {
        const normalizedId = accountId.trim() || DEFAULT_ACCOUNT_ID;
        return getManualUploadPath(platform, uploadMode, normalizedId, instagramScope);
    }, [accountId, instagramScope, platform, uploadMode]);

    const selectedFileLabel = isInstagramPosts
        ? 'Post CSV file(s)'
        : isLinkedIn
          ? 'LinkedIn workbook (.xls)'
          : uploadMode === 'csv'
          ? 'CSV file(s)'
          : 'ZIP archive';
    const accept = isLinkedIn
        ? '.xls,application/vnd.ms-excel'
        : isInstagramPosts || uploadMode === 'csv'
          ? '.csv,text/csv'
          : '.zip,application/zip';
    const allowsMultipleSelection = !isLinkedIn && uploadMode === 'csv';
    const uploadDescription = isLinkedIn
        ? 'Upload one LinkedIn .xls workbook containing Metrics and All posts sheets to update channel and post analytics.'
        : isInstagramPosts
        ? 'Upload one or more post-level CSV files to update Instagram post-wise insights in the database.'
        : 'Choose platform, file type, and account ID. Then drag files into the upload zone.';
    const successStats = success ? getSuccessStats(success) : [];

    const clearNativeFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resetSelectedFiles = () => {
        setFiles([]);
        clearNativeFileInput();
    };

    const handlePlatformChange = (nextPlatform: ManualPlatform) => {
        setPlatform(nextPlatform);
        if (nextPlatform === 'linkedin') {
            setUploadMode('xls');
        } else if (uploadMode === 'xls') {
            setUploadMode('csv');
        }
        resetSelectedFiles();
        setErrorMessage(null);
        setSuccess(null);
    };

    const handleInstagramScopeChange = (nextScope: ManualInstagramUploadScope) => {
        setInstagramScope(nextScope);
        if (nextScope === 'posts') {
            setUploadMode('csv');
        }
        resetSelectedFiles();
        setErrorMessage(null);
        setSuccess(null);
    };

    const handleUploadModeChange = (nextMode: ManualUploadMode) => {
        if (isLinkedIn) {
            setUploadMode('xls');
            return;
        }
        setUploadMode(nextMode);
        resetSelectedFiles();
        setErrorMessage(null);
        setSuccess(null);
    };

    const handleSelectedFiles = (selected: File[]) => {
        if (selected.length === 0) {
            setFiles([]);
            return;
        }

        if (isLinkedIn) {
            if (selected.length !== 1 || !isXlsFile(selected[0])) {
                setErrorMessage('LinkedIn mode requires exactly one .xls file.');
                setFiles([]);
                clearNativeFileInput();
                return;
            }

            setFiles([selected[0]]);
            setErrorMessage(null);
            setSuccess(null);
            return;
        }

        if (isInstagramPosts) {
            const invalidCsv = selected.filter((file) => !isCsvFile(file));
            if (invalidCsv.length > 0) {
                setErrorMessage('Post-wise mode accepts only .csv files.');
                setFiles([]);
                clearNativeFileInput();
                return;
            }

            setFiles(selected);
            setErrorMessage(null);
            setSuccess(null);
            return;
        }

        if (uploadMode === 'csv') {
            const invalidCsv = selected.filter((file) => !isCsvFile(file));
            if (invalidCsv.length > 0) {
                setErrorMessage('CSV mode only accepts .csv files.');
                setFiles([]);
                clearNativeFileInput();
                return;
            }
            setFiles(selected);
            setErrorMessage(null);
            setSuccess(null);
            return;
        }

        if (selected.length !== 1 || !isZipFile(selected[0])) {
            setErrorMessage('ZIP mode requires exactly one .zip file.');
            setFiles([]);
            clearNativeFileInput();
            return;
        }

        setFiles([selected[0]]);
        setErrorMessage(null);
        setSuccess(null);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.target.files ?? []);
        handleSelectedFiles(selected);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const selected = Array.from(event.dataTransfer.files ?? []);
        handleSelectedFiles(selected);
    };

    const removeFile = (indexToRemove: number) => {
        setFiles((previousFiles) => previousFiles.filter((_, index) => index !== indexToRemove));
        setSuccess(null);
        clearNativeFileInput();
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccess(null);

        const normalizedAccountId = accountId.trim() || DEFAULT_ACCOUNT_ID;

        if (files.length === 0) {
            setErrorMessage(`Please select ${selectedFileLabel.toLowerCase()} before uploading.`);
            return;
        }

        if (isLinkedIn && (files.length !== 1 || !isXlsFile(files[0]))) {
            setErrorMessage('LinkedIn upload requires exactly one .xls file.');
            return;
        }

        if (uploadMode === 'zip' && files.length !== 1) {
            setErrorMessage('ZIP mode requires exactly one file.');
            return;
        }

        if (isInstagramPosts && files.some((file) => !isCsvFile(file))) {
            setErrorMessage('Post-wise mode accepts only .csv files.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = await uploadManualInsights({
                platform,
                mode: uploadMode,
                instagramScope,
                accountId: normalizedAccountId,
                files,
            });
            setSuccess(payload);
            setLastCompletedAt(new Date().toLocaleString());
            resetSelectedFiles();
        } catch (error) {
            setErrorMessage((error as Error).message || 'Upload failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-heading font-bold text-stone-900">Manual Data Upload</h1>
                <p className="mt-1 text-sm text-stone-500">
                    Upload Instagram/Facebook CSVs or ZIP archives, Instagram post CSVs, or a LinkedIn .xls workbook to update analytics.
                </p>
            </div>

            <Card className={cn('overflow-hidden border', theme.panelBorder)}>
                <CardHeader className={cn('gap-3 border-b border-stone-200/70', theme.panelHeaderBg)}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <theme.Icon className={cn('h-5 w-5', theme.accentText)} />
                            <CardTitle className="text-base text-stone-900">Upload Configuration</CardTitle>
                        </div>
                        <Badge variant="outline" className={theme.badgeClass}>
                            {theme.title}
                        </Badge>
                    </div>
                    <CardDescription className="text-stone-600">
                        {uploadDescription}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label>Platform</Label>
                            <Tabs
                                value={platform}
                                onValueChange={(value) => handlePlatformChange(value as ManualPlatform)}
                                className="w-full"
                            >
                                <TabsList className="grid h-auto w-full grid-cols-3 bg-stone-100 p-1">
                                    <TabsTrigger
                                        value="insta"
                                        className="flex items-center gap-2 py-2 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700"
                                    >
                                        <Instagram className="h-4 w-4" />
                                        Instagram
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="facebook"
                                        className="flex items-center gap-2 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                                    >
                                        <Facebook className="h-4 w-4" />
                                        Facebook
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="linkedin"
                                        className="flex items-center gap-2 py-2 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700"
                                    >
                                        <Linkedin className="h-4 w-4" />
                                        LinkedIn
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {platform === 'insta' && (
                            <div className="space-y-2">
                                <Label>Instagram Data Scope</Label>
                                <Tabs
                                    value={instagramScope}
                                    onValueChange={(value) =>
                                        handleInstagramScopeChange(value as ManualInstagramUploadScope)
                                    }
                                    className="w-full"
                                >
                                    <TabsList className="grid h-auto w-full grid-cols-2 bg-violet-100/70 p-1">
                                        <TabsTrigger
                                            value="channelwise"
                                            className="py-2 data-[state=active]:bg-violet-200 data-[state=active]:text-violet-800"
                                        >
                                            Channelwise
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="posts"
                                            className="py-2 data-[state=active]:bg-violet-200 data-[state=active]:text-violet-800"
                                        >
                                            Post-wise
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <p className={cn('text-xs', theme.infoClass)}>
                                    {instagramScope === 'posts'
                                        ? 'Post-wise upload accepts one or more CSV files and updates /manual/insta/posts/{ig_user_id}/csvs.'
                                        : 'Channelwise upload supports CSV files or a ZIP folder archive.'}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Upload Type</Label>
                                {isLinkedIn ? (
                                    <Input value="LinkedIn workbook (.xls)" disabled />
                                ) : isInstagramPosts ? (
                                    <Input value="CSV file (posts.csv)" disabled />
                                ) : (
                                    <Select
                                        value={uploadMode}
                                        onValueChange={(value) => handleUploadModeChange(value as ManualUploadMode)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose upload type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">CSV files</SelectItem>
                                            <SelectItem value="zip">ZIP folder archive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="manual-account-id">{theme.accountLabel}</Label>
                                <Input
                                    id="manual-account-id"
                                    value={accountId}
                                    onChange={(event) => setAccountId(event.target.value)}
                                    placeholder={`${
                                        theme.accountParam === 'ig_user_id'
                                            ? 'test_user'
                                            : theme.accountParam === 'fb_user_id'
                                              ? 'test_page'
                                              : 'test_org'
                                    } (defaults to ${DEFAULT_ACCOUNT_ID})`}
                                    autoComplete="off"
                                />
                                <p className={cn('text-xs', theme.infoClass)}>
                                    Leave blank to use default ID: <span className="font-semibold">{DEFAULT_ACCOUNT_ID}</span>
                                </p>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            id="manual-upload-file"
                            type="file"
                            accept={accept}
                            multiple={allowsMultipleSelection}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <div className="space-y-2">
                            <Label>{selectedFileLabel}</Label>
                            <div
                                role="button"
                                tabIndex={0}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                className={cn(
                                    'relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                                    theme.dropzoneClass,
                                    isDragging && theme.dropzoneActiveClass,
                                )}
                            >
                                <div className={cn('rounded-full p-4', theme.endpointClass)}>
                                    {isLinkedIn || isInstagramPosts || uploadMode === 'csv' ? (
                                        <FileSpreadsheet className="h-8 w-8" />
                                    ) : (
                                        <FileArchive className="h-8 w-8" />
                                    )}
                                </div>
                                <p className="mt-4 text-lg font-semibold text-stone-900">
                                    Drag and drop{' '}
                                    {isLinkedIn
                                        ? 'a LinkedIn .xls workbook'
                                        : isInstagramPosts
                                        ? 'post CSV files'
                                        : uploadMode === 'csv'
                                          ? 'CSV files'
                                          : 'a ZIP archive'}{' '}
                                    here
                                </p>
                                <p className="mt-1 text-sm text-stone-500">
                                    or click to browse from your computer
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-5"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <UploadCloud className="h-4 w-4" />
                                    Choose file
                                    {isLinkedIn ? '' : uploadMode === 'csv' ? 's' : ''}
                                </Button>
                                <p className={cn('mt-4 text-xs', theme.infoClass)}>
                                    {isLinkedIn
                                        ? 'Supports one .xls workbook with Metrics and All posts sheets'
                                        : isInstagramPosts
                                        ? 'Supports one or more .csv files'
                                        : uploadMode === 'csv'
                                          ? 'Supports one or more .csv files'
                                          : 'Supports one .zip file containing CSV files'}
                                </p>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
                                <p className="text-xs font-medium text-stone-700">Selected file(s):</p>
                                <ul className="mt-2 space-y-1.5 text-xs text-stone-600">
                                    {files.map((file, index) => (
                                        <li
                                            key={`${file.name}-${file.lastModified}`}
                                            className="flex items-center justify-between gap-3 rounded-md bg-white px-2 py-1"
                                        >
                                            <span className="truncate">{file.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="shrink-0 text-stone-400">{formatFileSize(file.size)}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="text-stone-400 hover:text-red-600"
                                                    onClick={() => removeFile(index)}
                                                    aria-label={`Remove ${file.name}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className={cn('rounded-lg border px-3 py-2 text-xs font-mono', theme.endpointClass)}>
                            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Endpoint</p>
                            <p className="mt-1 break-all">POST {endpointResolved}</p>
                        </div>

                        {errorMessage && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {success && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800">Upload completed successfully.</p>
                                        <p className="text-xs text-emerald-700">{success.message}</p>
                                        {lastCompletedAt && (
                                            <p className="mt-1 text-[11px] text-emerald-700">Completed at: {lastCompletedAt}</p>
                                        )}
                                    </div>
                                </div>

                                {successStats.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-900 md:grid-cols-4">
                                        {successStats.map((stat) => (
                                            <div
                                                key={stat.label}
                                                className="rounded-md bg-white/70 px-2 py-1"
                                            >
                                                <span className="block text-[11px] text-emerald-700">{stat.label}</span>
                                                <span className="font-semibold">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {typeof success.processed_file === 'string' &&
                                    success.processed_file.length > 0 && (
                                        <p className="mt-2 text-[11px] text-emerald-700">
                                            Source file:{' '}
                                            <span className="font-medium">{success.processed_file}</span>
                                        </p>
                                    )}
                                {Array.isArray(success.metric_keys) && success.metric_keys.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[11px] font-medium text-emerald-800">Imported metrics</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {success.metric_keys.map((metricKey) => (
                                                <Badge
                                                    key={metricKey}
                                                    variant="outline"
                                                    className="border-emerald-200 bg-white text-[10px] text-emerald-700"
                                                >
                                                    {metricKey}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {typeof success.archive_name === 'string' && success.archive_name.length > 0 && (
                                    <p className="mt-2 text-[11px] text-emerald-700">
                                        Archive: <span className="font-medium">{success.archive_name}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={cn('text-white', theme.submitClass)}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-4 w-4" />
                                        Upload and Update Database
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    resetSelectedFiles();
                                    setErrorMessage(null);
                                    setSuccess(null);
                                }}
                                disabled={isSubmitting}
                            >
                                Clear Selection
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
