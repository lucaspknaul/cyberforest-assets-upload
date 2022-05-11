import Arweave from 'arweave';
import TestWeave from 'testweave-sdk';
import fs from 'fs';
import crypto from 'crypto';

var isProd;
var keyFilePath;

const readArgs = async () => {
  const args = process.argv.slice(2);
  if (args.length == 0){
    console.log('you must pass arguments');
    process.exit(1);
  }
  const mode = args[0];
  switch (mode){
    case 'prod':
      isProd = true;
      if(args.length == 1){
        console.log('you must pass the wallet path in production mode');
        process.exit(1);
      }
      keyFilePath = args[1];
      break;
    case 'dev':
      isProd = false;
      break;
    default:
      console.log(`${mode} is not a valid mode argument`);
      process.exit(1);
  }
}

const startArweave = async () => {
  const host = isProd ? 'arweave.net' : 'localhost';
  const protocol = isProd ? 'https' : 'http';
  const arweave = await Arweave.init({
    host: host,
    port: 1984,
    protocol: protocol,
    timeout: 20000,
    logging: true,
  });
  if (!isProd) {
    const testWeave = await TestWeave.default.init(arweave);
    return {arweave, testWeave};
  }
  else
    return {arweave};
}

const getKey = async keyData => {
  if (isProd) {
    const keyFile = await fs.readFileSync(keyFilePath);
    return JSON.parse(keyFile)
  }
  else {
    let {arweave, testWeave} = keyData;
    const key = await arweave.wallets.generate();
    const keyAddress = await arweave.wallets.getAddress(key);
    await testWeave.drop(keyAddress, '10000000000000');
    return key;
  }
}

const loadAssetMap = async () => {
  const fileMapName = isProd ? 'assets_map.prod.json' : 'assets_map.dev.json';
  const fileMapExists = fs.existsSync(fileMapName);
  return fileMapExists ? JSON.parse(fs.readFileSync(fileMapName)) : {};
}

const saveAssetMap = async (transaction, assetMap, assetName, assetHash) => {
  const fileMapName = isProd ? 'assets_map.prod.json' : 'assets_map.dev.json';
  const host = isProd ? 'arweave.net' : 'localhost:1984';
  const protocol = isProd? 'https' : 'http';
  const assetAddress = transaction.id;
  assetMap[assetName] = {};
  assetMap[assetName].address = protocol + '://' + host + '/' + assetAddress;
  assetMap[assetName].hash = assetHash;
  await fs.writeFileSync(fileMapName, JSON.stringify(assetMap));
}

const getAssetNames = async path => {
  const dirAbsolutePath = 'assets' + (path ? ('/' + path) : '');
  const dirRelativePath = path || '';
  const fileNames = await fs.readdirSync(dirAbsolutePath);
  let assetNames = [];
  for (const fileName of fileNames) {
    const fileAbsolutePath = dirAbsolutePath + '/' + fileName;
    const fileRelativePath = dirRelativePath ? (dirRelativePath + '/' + fileName) : fileName;
    const isDir = await fs.lstatSync(fileAbsolutePath).isDirectory();
    if (isDir){
      const dirAssetNames = await getAssetNames(fileRelativePath);
      assetNames = [...assetNames, ...dirAssetNames];
    }
    else {
      assetNames.push(fileRelativePath);
    }
  }
  return assetNames;
}
const isAssetUploaded = (assetName, assetHash, assetMap) => assetName in assetMap && assetMap[assetName].hash === assetHash;
const loadAsset = async assetName => await fs.readFileSync('assets/' + assetName);
const hashAsset = asset => crypto.createHash('md5').update(asset).digest('hex');

const uploadAsset = async uploadData => {
  let {asset, arweave, key} = uploadData;
  const transaction = await arweave.createTransaction({data: asset}, key);
  transaction.addTag('Content-Type', 'image/png');
  await arweave.transactions.sign(transaction, key);
  const uploader = await arweave.transactions.getUploader(transaction);
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    if (!isProd){
      let {testWeave} = uploadData;
      await testWeave.mine();
    }
  }
  return transaction; 
} 

const mine = async arweaveData => {
  if(!isProd){
    let {testWeave} = arweaveData;
    testWeave.mine();
  }
}

console.log ('starting');
readArgs ();
console.log ('arguments read');
const arweaveData = await startArweave ();
console.log ('arweave started');
const key = await getKey (arweaveData);
console.log ('key retrieved');

const assetMap = await loadAssetMap ();
console.log ('asset map loaded');
const assetNames = await getAssetNames ();
console.log ('asset names retrieved');

for (const assetName of assetNames){
  const asset = await loadAsset (assetName);
  console.log (`asset '${assetName}' loaded`);
  const assetHash = await hashAsset (asset);
  console.log (`asset ${assetName} hash generated`);
  if (isAssetUploaded (assetName, assetHash, assetMap)){
    console.log (`asset '${assetName}' already uploaded. skipping`);
    continue;
  }
  const transaction = await uploadAsset ({asset, key, ...arweaveData});
  console.log (`asset '${assetName}' uploaded`);
  await saveAssetMap (transaction, assetMap, assetName, assetHash);
  console.log (`asset '${assetName}' saved in asset map`);
}
console.log ('finished');

