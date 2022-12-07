import * as web3 from "@solana/web3.js"
import {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
} from "@metaplex-foundation/js"
import {
    DataV2,
    createCreateMetadataAccountV2Instruction,
    createUpdateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import * as fs from "fs"

export async function createTokenMetadata(
    connection: web3.Connection,
    metaplex: Metaplex,
    mint: web3.PublicKey,
    user: web3.Keypair,
    name: string,
    symbol: string,
    description: string
) {
    // file to buffer
    const buffer = fs.readFileSync("/Users/burakalaydin/Desktop/Solana-courses/GalactusToken/src/assets/galactus.jpeg");

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, "galactus.jpeg");

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: name,
        description: description,
        image: imageUri
    });
    console.log("metadata uri:", uri);

    // get metadata account address
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint });

    // onchain metadata format
    const tokenMetadata = {
        name: name,
        symbol: symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2

    // transaction to create metadata account
    const transaction = new web3.Transaction().add(
        createCreateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                mint: mint,
                mintAuthority: user.publicKey,
                payer: user.publicKey,
                updateAuthority: user.publicKey,
            },
            {
                createMetadataAccountArgsV2: {
                    data: tokenMetadata,
                    isMutable: true,
                },
            }
        )
    );

    // transaction to update metadata account
    const updateTransaction = new web3.Transaction().add(
        createUpdateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                updateAuthority: user.publicKey,
            },
            {
                updateMetadataAccountArgsV2: {
                    data: tokenMetadata,
                    updateAuthority: user.publicKey,
                    primarySaleHappened: true,
                    isMutable: true,
                },
            }
        )
    )

    // Only return this if you want to send a single transaction during mint
    return createCreateMetadataAccountV2Instruction(
        {
            metadata: metadataPDA,
            mint: mint,
            mintAuthority: user.publicKey,
            payer: user.publicKey,
            updateAuthority: user.publicKey,
        },
        {
            createMetadataAccountArgsV2: {
                data: tokenMetadata,
                isMutable: true,
            },
        }
    );

    // remove return statement if you want to send transaction seperately by using this function
    // send transaction
    // if you want to create new metadata send "transaction", if you want to update send "updateTransaction"
    const transactionSignature = await web3.sendAndConfirmTransaction(connection, transaction, [user]);
    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}