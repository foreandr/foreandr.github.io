/* CREATE TABLE BLOGPOSTS */
USE [foreandr.github.io.DATABASE];
GO
CREATE TABLE dbo.Writers(
ID INT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
FirstName NVARCHAR (50),
LastName NVARCHAR (50), 
DateOfBIrth DATE,
Country NVARCHAR(80),
);


/* INSERT INTO TABLE dbo.Writers */
USE [foreandr.github.io.DATABASE];
GO
INSERT INTO dbo.Writers
(
    FirstName, -- FirstName - nvarchar(50)
    LastName, -- LastName - nvarchar(50)
    DateOfBIrth,  -- DateOfBIrth - date
    Country -- Country - nvarchar(80)
)
VALUES
(   'Andre', 'Foreman', 'Nov 22 1997', 'Canada'  ),
(   'Codi', 'burton', 'Feb 7 1997', 'America'  )
GO

/* DROP TABLE dbo.Writers */
DROP TABLE dbo.Writers;

/* CREATE TABLE BLOGPOSTS */
USE [foreandr.github.io.DATABASE];
GO
CREATE TABLE dbo.BlogPosts(
ID INT NOT NULL IDENTITY(1, 1),
WriterID INT FOREIGN KEY (WriterID) REFERENCES dbo.Writers(ID),
Title NVARCHAR (50),
UploadDate DATE,
Contents NVARCHAR (4000), 
);
/* INSERT INTO TABLE dbo.BLOGPOSTS */
USE [foreandr.github.io.DATABASE];
GO
INSERT INTO dbo.BlogPosts
( WriterID, Title, UploadDate, Contents)
VALUES
(   
1, -- WriterID - int
'Blog Test', -- Title - nvarchar(50)
GETDATE(), -- UploadDate - date
'Here will be a post that can be 4000 characters long. Formatting it will be difficult.'  -- Contents - nvarchar(4000)
)

