const asyncHandler = require('express-async-handler')
const Product = require('../models/productModel')
const { fileSizeFormatter } = require('../utils/fileUpload.js')
const cloudinary = require('cloudinary').v2

const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, quantity, price, description } = req.body

  if (!name || !category || !quantity || !price || !description) {
    res.status(400)
    throw new Error('Please fill in all fields')
  }

  // handle image
  let fileData = {}
  if (req.file) {
    // save image to cloudinary
    let uploadedFile
    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: 'inventory-products',
        resource_type: 'image',
      })
    } catch (error) {
      res.status(500)
      throw new Error('Error uploading image ')
    }

    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      size: fileSizeFormatter(req.file.size, 2),
    }
  }

  // create product
  const product = await Product.create({
    user: req.user.id,
    name,
    sku,
    category,
    quantity,
    price,
    description,
    image: fileData,
  })

  res.status(201).json(product)
})

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ user: req.user.id }).sort('-createdAt')

  res.status(200).json(products)
})

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  if (product.user.toString() !== req.user.id) {
    res.status(401)
    throw new Error('Not authorized')
  }

  res.status(200).json(product)
})

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  if (product.user.toString() !== req.user.id) {
    res.status(401)
    throw new Error('Not authorized')
  }

  await product.remove()

  res.status(200).json({ message: 'Product removed' })
})

const updateProduct = asyncHandler(async (req, res) => {
  const { name, category, quantity, price, description } = req.body
  const { id } = req.params

  const product = await Product.findById(id)

  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  if (product.user.toString() !== req.user.id) {
    res.status(401)
    throw new Error('Not authorized')
  }

  // handle image
  let fileData = {}
  if (req.file) {
    // save image to cloudinary
    let uploadedFile
    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: 'inventory-products',
        resource_type: 'image',
      })
    } catch (error) {
      res.status(500)
      throw new Error('Error uploading image ')
    }

    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      size: fileSizeFormatter(req.file.size, 2),
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    {
      _id: id,
    },
    {
      name,
      category,
      quantity,
      price,
      description,
      image: Object.keys(fileData).length === 0 ? product?.image : fileData,
    },
    {
      new: true,
      runValidators: true,
    }
  )

  res.status(200).json(updatedProduct)
})

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  deleteProduct,
  updateProduct,
}
