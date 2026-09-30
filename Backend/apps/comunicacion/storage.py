from cloudinary_storage.storage import MediaCloudinaryStorage


class ChatMediaCloudinaryStorage(MediaCloudinaryStorage):
    """CU14: los mensajes de chat pueden traer imagen, audio o video —
    MediaCloudinaryStorage por defecto sube todo como RESOURCE_TYPE='image',
    lo que rompe archivos de audio/video. 'auto' deja que Cloudinary
    detecte el tipo real por el contenido del archivo."""

    RESOURCE_TYPE = 'auto'
