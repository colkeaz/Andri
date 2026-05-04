import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { BigButton } from '../components/BigButton';
import { dbService } from '../database/db';
import { Save, Package } from 'lucide-react-native';

export const ManualAddScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const handleSave = async () => {
    if (!name || !quantity || !costPrice || !sellingPrice) {
      Alert.alert('Missing Info', 'Please fill in all fields so we can track your profit.');
      return;
    }

    try {
      const productId = Date.now().toString();
      await dbService.addProduct(productId, name);
      await dbService.addBatch(
        `B-${productId}`,
        productId,
        parseInt(quantity),
        parseFloat(costPrice),
        parseFloat(sellingPrice)
      );

      Alert.alert('Success!', `${name} has been added to your shop.`);
      onComplete();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong while saving.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Package color={COLORS.primary} size={40} />
          <Text style={TYPOGRAPHY.h1}>Add Item Manually</Text>
          <Text style={TYPOGRAPHY.body}>Enter the details of your stock</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Lucky Me Noodles"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} placeholder="e.g. Snacks" />
            </View>
          </View>

          <Text style={styles.label}>Supplier Price (Cost)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            keyboardType="numeric"
            value={costPrice}
            onChangeText={setCostPrice}
          />

          <Text style={styles.label}>Your Selling Price</Text>
          <TextInput 
            style={styles.input} 
            placeholder="₱ 0.00"
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={setSellingPrice}
          />

          <BigButton 
            title="SAVE TO INVENTORY" 
            color={COLORS.success}
            onPress={handleSave}
            style={styles.saveButton}
            icon={<Save color={COLORS.white} size={28} />}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  label: {
    ...TYPOGRAPHY.bodyLarge,
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    height: 60,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.overlay,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    marginTop: 10,
  }
});
