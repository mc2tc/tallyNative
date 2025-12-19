// Firebase Storage upload helpers
import { getApp } from 'firebase/app'
import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL,
} from 'firebase/storage'

/**
 * Upload a local file (expo-image-picker URI) to Firebase Storage and return a signed download URL.
 * Path: receipts/{businessId}/{timestamp}_{fileNameOrExt}
 * Returns both the download URL and file size in bytes for storage tracking.
 */
export async function uploadReceiptAndGetUrl(params: {
	businessId: string
	localUri: string
	fileNameHint?: string
	contentType?: string
}): Promise<{ downloadUrl: string; fileSize: number }> {
	const { businessId, localUri, fileNameHint, contentType } = params

	// Resolve filename/extension
	const inferredExt =
		fileNameHint?.split('.').pop() ||
		localUri.split('?')[0].split('#')[0].split('.').pop() ||
		'jpg'
	const safeExt = inferredExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
	const timestamp = Date.now()
	const storagePath = `receipts/${businessId}/${timestamp}.${safeExt}`

	// Fetch the file data
	const response = await fetch(localUri)
	const blob = await response.blob()
	const fileSize = blob.size // Get file size in bytes

	// Upload
	const app = getApp()
	const storage = getStorage(app)
	const objectRef = ref(storage, storagePath)
	await uploadBytes(objectRef, blob, {
		contentType: contentType || blob.type || `image/${safeExt}`,
	})

	// Return a signed download URL suitable for backend OCR and file size for tracking
	const downloadUrl = await getDownloadURL(objectRef)
	return { downloadUrl, fileSize }
}


