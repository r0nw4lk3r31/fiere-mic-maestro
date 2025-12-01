photo upload via admin page:

OpenMicDataService.ts:332 
 POST http://localhost:3001/api/photos 400 (Bad Request)

installHook.js:1 Error uploading photos: Error: No file uploaded
    at OpenMicDataService.uploadPhoto (OpenMicDataService.ts:340:13)
    at async uploadPhotos (PhotoManager.tsx:136:9)