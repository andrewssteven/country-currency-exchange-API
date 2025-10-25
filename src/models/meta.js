module.exports = (sequelize, DataTypes) => {
  const Meta = sequelize.define(
    "Meta",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      value: { type: DataTypes.TEXT, allowNull: true },
    },
    { timestamps: false }
  );

  return Meta;
};
