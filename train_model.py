import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2

/**
 * AI MODEL CREATOR FOR SMART INVENTORY SYSTEM
 * This script defines a lightweight MobileNetV2 architecture 
 * suitable for identifying sari-sari store items.
 */

def create_inventory_model(num_classes):
    # Load MobileNetV2 as the base (pre-trained on ImageNet)
    base_model = MobileNetV2(input_shape=(224, 224, 3),
                             include_top=False,
                             weights='imagenet')
    
    # Freeze the base model
    base_model.trainable = False

    # Add custom classification head
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(num_classes, activation='softmax')
    ])

    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    
    return model

def export_to_tflite(model, filename="inventory_model.tflite"):
    # Convert to TFLite format for mobile use
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    # Save the model
    with open(filename, 'wb') as f:
        f.write(tflite_model)
    print(f"Model exported successfully to {filename}")

if __name__ == "__main__":
    # Example: 10 common sari-sari store classes (Coke, Noodles, etc.)
    NUM_CLASSES = 10
    model = create_inventory_model(NUM_CLASSES)
    model.summary()
    
    # After training (model.fit), run:
    # export_to_tflite(model)
