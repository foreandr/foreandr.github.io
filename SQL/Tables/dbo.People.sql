CREATE TABLE [dbo].[People]
(
[ID] [int] NOT NULL IDENTITY(1, 1),
[FirstName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[LastName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[City] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[Country] [nvarchar] (60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[People] ADD CONSTRAINT [PK__People__3214EC27A087DAEF] PRIMARY KEY CLUSTERED ([ID]) ON [PRIMARY]
GO


USE myDatabase;
GO
CREATE TABLE dbo.Blog
(
ID INT NOT NULL IDENTITY(1, 1),
Title NVARCHAR (50),
Author NVARCHAR (50), 
uploadedDate DATE,
contents NVARCHAR(8000),
) 
GO

DROP TABLE dbo.Blog;
