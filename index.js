const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const multer = require('multer');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const app = express();
app.use(morgan('dev'));
const port = 3000;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure AWS SDK with your credentials and region

const s3Client = new S3Client({
  region: 'us-east-1', // Change to your desired region
  credentials: {
    accessKeyId: 'YOUR_KEY',
    secretAccessKey: 'YOUR_sECRET_KEY',
  },
});

async function downloadFileFromS3(req, res) {
  const params = {
    Bucket: 'momin-bucket-v1',
    Key: '11.jpg',
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(params));

    // Create a write stream to save the file to the local filesystem
    const fileStream = fs.createWriteStream('downloaded-file.jpg');

    // Pipe the binary data to the write stream
    data.Body.pipe(fileStream);

    // Wait for the write stream to finish and then log a success message
    fileStream.on('finish', () => {
      res.json('File downloaded and saved successfully.');
      console.log('File downloaded and saved successfully.');
    });
  } catch (err) {
    console.error('Error downloading file:', err);

    // Return an error response
    res.status(500).json({
      error: 'Error downloading file',
      message: err.message,
    });
  }
}

app.get('/get', downloadFileFromS3);
// Set up routes for file upload and deletion
// File Upload Route

app.post('/upload', upload.any('file'), (req, res) => {
  const file = req.files[0];
  console.log('Uploaded file:', file);

  const params = {
    Bucket: 'momin-bucket-v1',
    Key: file.originalname,
    Body: file.buffer,
    // ContentEncoding: 'base64',
    // ContentDisposition: 'inline',
    // ContentType: 'image/jpeg',
  };

  s3Client
    .send(new PutObjectCommand(params))
    .then(() => {
      const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
      res.json({
        message: 'File uploaded to S3',
        location: imageUrl,
      });
    })
    .catch((err) => {
      console.error('Error uploading file to S3:', err);
      res
        .status(500)
        .json({ error: 'Error uploading file to S3', message: err.message });
    });
});

// File Deletion Route
app.delete('/delete', async (req, res) => {
  const params = {
    Bucket: 'momin-bucket-v1',
    Key: 'ji.jpg', // Specify the key of the file you want to delete
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    //   .then((item) => console.log('--------', item));
    res.json({ message: 'File deleted from S3' });
  } catch (err) {
    console.error('Error deleting file from S3:', err);
    res
      .status(500)
      .json({ error: 'Error deleting file from S3', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
